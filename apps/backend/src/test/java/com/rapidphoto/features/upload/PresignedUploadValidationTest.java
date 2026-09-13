package com.rapidphoto.features.upload;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoId;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import com.rapidphoto.domain.user.Email;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserId;
import com.rapidphoto.domain.user.UserRepository;
import com.rapidphoto.infrastructure.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The presigned path hands the bytes to the object store directly, so the
 * server only gets two chances to say no: before it issues the URL, and after
 * the object lands. These cover both.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PresignedUploadValidationTest {

    @Autowired private UploadService uploadService;
    @Autowired private PhotoRepository photoRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StorageService storageService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User(UserId.generate(), new Email("presign@example.com"), "presignuser", "hashed");
        userRepository.save(user);
    }

    private UUID userId() {
        return user.getId().getValue();
    }

    private static PresignedUploadRequest request(String name, String mime, long size) {
        return new PresignedUploadRequest(name, mime, size);
    }

    // ---- refused before a URL exists ---------------------------------------

    @Test
    @DisplayName("a declared size beyond the limit is refused before any URL is issued")
    void rejectsOversizeDeclaration() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            uploadService.generatePresignedUploadUrl(userId(), request("huge.jpg", "image/jpeg", 5L * 1024 * 1024 * 1024)));
        assertTrue(ex.getMessage().contains("too large"), ex.getMessage());
    }

    @Test
    @DisplayName("a non-positive declared size is refused")
    void rejectsNonPositiveSize() {
        assertThrows(IllegalArgumentException.class, () ->
            uploadService.generatePresignedUploadUrl(userId(), request("empty.jpg", "image/jpeg", 0L)));
    }

    @Test
    @DisplayName("a content type outside the allowlist is refused")
    void rejectsDisallowedMimeType() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            uploadService.generatePresignedUploadUrl(userId(), request("payload.exe", "application/octet-stream", 1024L)));
        assertTrue(ex.getMessage().contains("Unsupported content type"), ex.getMessage());
    }

    @Test
    @DisplayName("a request that would exceed the quota is refused before any URL is issued")
    void rejectsOverQuota() {
        // Fill the allowance exactly, so any further byte is over.
        user.addStorageUsage(user.getStorageQuota().getQuotaBytes());
        userRepository.save(user);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
            uploadService.generatePresignedUploadUrl(userId(), request("one-more.jpg", "image/jpeg", 1024L)));
        assertTrue(ex.getMessage().contains("quota"), ex.getMessage());
    }

    // ---- refused after the object lands ------------------------------------

    /** A photo record as presign would have left it, plus whatever bytes we choose to "upload". */
    private Photo stagePhoto(String mime, long declaredSize, byte[] actualBytes) {
        String storagePath = userId() + "/staged-" + UUID.randomUUID() + ".jpg";
        Photo photo = new Photo(
            PhotoId.generate(), user.getId(),
            "staged.jpg", "staged.jpg", declaredSize, mime, storagePath
        );
        photoRepository.save(photo);
        if (actualBytes != null) {
            storageService.store(storagePath, new ByteArrayInputStream(actualBytes), mime, actualBytes.length);
        }
        return photo;
    }

    private static byte[] jpegBytes(int length) {
        byte[] data = new byte[length];
        data[0] = (byte) 0xFF; data[1] = (byte) 0xD8; data[2] = (byte) 0xFF; data[3] = (byte) 0xE0;
        return data;
    }

    @Test
    @DisplayName("completing an upload that never happened is refused")
    void rejectsMissingObject() {
        Photo photo = stagePhoto("image/jpeg", 2048, null);

        assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(userId(), photo.getId().getValue()));

        assertEquals(PhotoStatus.FAILED,
            photoRepository.findById(photo.getId().getValue()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("bytes that do not match the declared size are refused and deleted")
    void rejectsSizeMismatch() {
        // Declared 2 KB, actually uploaded 64 KB: the "declare small, PUT large"
        // case that the presigned path could not previously detect.
        Photo photo = stagePhoto("image/jpeg", 2048, jpegBytes(64 * 1024));
        String path = photo.getStorageInfo().getStoragePath();
        assertTrue(storageService.exists(path), "precondition: the object is present");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(userId(), photo.getId().getValue()));

        assertTrue(ex.getMessage().contains("does not match the declared size"), ex.getMessage());
        assertFalse(storageService.exists(path), "the rejected object must not be left in the bucket");
        assertEquals(PhotoStatus.FAILED,
            photoRepository.findById(photo.getId().getValue()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("content that is not the declared image type is refused and deleted")
    void rejectsContentTypeMismatch() {
        // Correct length, declared as a JPEG, actually an ELF binary.
        byte[] elf = new byte[4096];
        elf[0] = 0x7F; elf[1] = 'E'; elf[2] = 'L'; elf[3] = 'F';
        Photo photo = stagePhoto("image/jpeg", 4096, elf);
        String path = photo.getStorageInfo().getStoragePath();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(userId(), photo.getId().getValue()));

        assertTrue(ex.getMessage().contains("not a supported image format"), ex.getMessage());
        assertFalse(storageService.exists(path));
        assertEquals(PhotoStatus.FAILED,
            photoRepository.findById(photo.getId().getValue()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("a PNG declared as a JPEG is refused")
    void rejectsWrongImageFormat() {
        byte[] png = new byte[4096];
        int[] sig = {0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        for (int i = 0; i < sig.length; i++) png[i] = (byte) sig[i];

        Photo photo = stagePhoto("image/jpeg", 4096, png);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(userId(), photo.getId().getValue()));
        assertTrue(ex.getMessage().contains("image/png"), ex.getMessage());
    }

    @Test
    @DisplayName("a rejected upload refunds the quota it was charged at presign time")
    void refundsQuotaOnRejection() {
        long declared = 4096;
        user.addStorageUsage(declared); // as StartPhotoUploadCommandHandler would have
        userRepository.save(user);
        long usedBefore = userRepository.findById(userId()).orElseThrow()
            .getStorageQuota().getUsedBytes();

        byte[] elf = new byte[(int) declared];
        elf[0] = 0x7F; elf[1] = 'E'; elf[2] = 'L'; elf[3] = 'F';
        Photo photo = stagePhoto("image/jpeg", declared, elf);

        assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(userId(), photo.getId().getValue()));

        long usedAfter = userRepository.findById(userId()).orElseThrow()
            .getStorageQuota().getUsedBytes();
        assertEquals(usedBefore - declared, usedAfter,
            "charging for bytes that were rejected would let repeated bad uploads exhaust the allowance");
    }

    @Test
    @DisplayName("another user's photo cannot be completed")
    void rejectsForeignPhoto() {
        Photo photo = stagePhoto("image/jpeg", 4096, jpegBytes(4096));
        UUID strangerId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () ->
            uploadService.completeDirectUpload(strangerId, photo.getId().getValue()));
    }
}
