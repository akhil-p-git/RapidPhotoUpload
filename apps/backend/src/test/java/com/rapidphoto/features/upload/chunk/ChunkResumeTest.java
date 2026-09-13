package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoId;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import com.rapidphoto.domain.photo.UploadChunk;
import com.rapidphoto.domain.photo.UploadChunkRepository;
import com.rapidphoto.domain.user.Email;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserId;
import com.rapidphoto.domain.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Covers the behaviour that makes "resumable" true rather than aspirational:
 * the server can say exactly which chunks it holds, repeated sends are safe,
 * order does not matter, and abandoned uploads are eventually reclaimed.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChunkResumeTest {

    private static final long CHUNK_SIZE = 5L * 1024 * 1024;

    @Autowired private ChunkUploadService chunkUploadService;
    @Autowired private AbandonedUploadCollector collector;
    @Autowired private PhotoRepository photoRepository;
    @Autowired private UploadChunkRepository chunkRepository;
    @Autowired private UserRepository userRepository;

    private User user;
    private Photo photo;

    /** A file large enough to need three chunks at the configured chunk size. */
    private static final long THREE_CHUNK_FILE = (long) (CHUNK_SIZE * 2.5);

    @BeforeEach
    void setUp() {
        user = new User(UserId.generate(), new Email("resume@example.com"), "resumeuser", "hashed");
        userRepository.save(user);

        photo = new Photo(
            PhotoId.generate(), user.getId(),
            "big.jpg", "big.jpg", THREE_CHUNK_FILE, "image/jpeg", "uploads/big.jpg"
        );
        photoRepository.save(photo);
    }

    private UUID photoId() {
        return photo.getId().getValue();
    }

    private ChunkUploadResponse sendChunk(int chunkNumber, int totalChunks) {
        MockMultipartFile file = new MockMultipartFile(
            "file", "chunk-" + chunkNumber, "application/octet-stream",
            ("payload for chunk " + chunkNumber).getBytes()
        );
        ChunkUploadRequest request = new ChunkUploadRequest();
        request.setPhotoId(photoId());
        request.setChunkNumber(chunkNumber);
        request.setTotalChunks(totalChunks);
        request.setChunkSize(file.getSize());
        return chunkUploadService.uploadChunk(request, file);
    }

    @Test
    @DisplayName("chunks arriving out of order are reported by number, not by count")
    void outOfOrderArrival() {
        sendChunk(2, 3);
        sendChunk(0, 3);

        ChunkUploadResponse progress = chunkUploadService.getUploadProgress(photoId(), 3);

        // The count alone (2) would let a resuming client conclude that chunks
        // 0 and 1 are present and send only chunk 2 -- losing chunk 1 entirely.
        assertEquals(2, progress.getUploadedChunks());
        assertEquals(List.of(0, 2), progress.getReceivedChunks());
        assertEquals(List.of(1), progress.getMissingChunks());
        assertEquals("IN_PROGRESS", progress.getStatus());
    }

    @Test
    @DisplayName("re-sending a chunk is idempotent and does not double-count")
    void duplicateChunkIsIdempotent() {
        sendChunk(1, 3);
        ChunkUploadResponse afterDuplicate = sendChunk(1, 3);

        assertEquals(1, afterDuplicate.getUploadedChunks());
        assertEquals(List.of(1), afterDuplicate.getReceivedChunks());
        assertEquals(1, chunkRepository.findByPhotoId(photoId()).size());
    }

    @Test
    @DisplayName("after a reload the server reports exactly what is left to send")
    void resumeAfterReload() {
        sendChunk(0, 3);
        sendChunk(2, 3);

        // The client is gone at this point; all it retains is the photoId. What
        // it can recover is whatever this call returns.
        ChunkUploadResponse resumed = chunkUploadService.getUploadProgress(photoId(), 3);
        assertEquals(List.of(1), resumed.getMissingChunks());

        for (Integer missing : resumed.getMissingChunks()) {
            sendChunk(missing, 3);
        }

        ChunkUploadResponse finished = chunkUploadService.getUploadProgress(photoId(), 3);
        assertTrue(finished.getMissingChunks().isEmpty());
        assertEquals(List.of(0, 1, 2), finished.getReceivedChunks());
        assertEquals("COMPLETED", finished.getStatus());
    }

    @Test
    @DisplayName("expected chunk count is derived from stored size, not taken from the caller")
    void totalChunksDerivedServerSide() {
        sendChunk(0, 3);

        // No totalChunks supplied: the server must work it out from the file it
        // recorded at initialize time. A caller that could shrink this number
        // could be told an incomplete upload was finished.
        ChunkUploadResponse progress = chunkUploadService.getUploadProgress(photoId(), null);

        assertEquals(3, progress.getTotalChunks());
        assertEquals(List.of(1, 2), progress.getMissingChunks());
    }

    @Test
    @DisplayName("chunk rows in a non-uploaded state are not reported as received")
    void pendingChunksAreNotCountedAsReceived() {
        sendChunk(0, 3);

        // A row that was created but never completed. Previously the received
        // list came from every row regardless of status while the count came
        // from UPLOADED rows only, so the two disagreed and this chunk looked
        // present to a resuming client.
        UploadChunk stranded = new UploadChunk(UUID.randomUUID(), photoId(), 1, 128L);
        chunkRepository.save(stranded);

        ChunkUploadResponse progress = chunkUploadService.getUploadProgress(photoId(), 3);

        assertEquals(List.of(0), progress.getReceivedChunks());
        assertTrue(progress.getMissingChunks().contains(1));
        assertEquals(progress.getReceivedChunks().size(), progress.getUploadedChunks());
    }

    @Test
    @DisplayName("an abandoned upload has its chunks reclaimed and is marked failed")
    void abandonedUploadIsCollected() {
        sendChunk(0, 3);
        sendChunk(1, 3);
        assertEquals(2, chunkRepository.findByPhotoId(photoId()).size());

        collector.collect(photo);

        assertTrue(chunkRepository.findByPhotoId(photoId()).isEmpty(),
            "chunk rows should be gone after collection");

        Photo reloaded = photoRepository.findById(photoId()).orElseThrow();
        assertEquals(PhotoStatus.FAILED, reloaded.getStatus());
    }
}
