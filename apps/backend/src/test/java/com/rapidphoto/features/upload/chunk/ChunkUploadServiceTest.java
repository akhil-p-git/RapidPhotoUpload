package com.rapidphoto.features.upload.chunk;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChunkUploadServiceTest {

    @Autowired
    private ChunkUploadService chunkUploadService;

    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Photo testPhoto;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User(
            com.rapidphoto.domain.user.UserId.generate(),
            new com.rapidphoto.domain.user.Email("test@example.com"),
            "testuser",
            "hashedPassword"
        );
        userRepository.save(testUser);

        // Create test photo
        testPhoto = new Photo(
            com.rapidphoto.domain.photo.PhotoId.generate(),
            testUser.getId(),
            "test.jpg",
            "test.jpg",
            1024L,
            "image/jpeg",
            "uploads/test.jpg"
        );
        photoRepository.save(testPhoto);
    }

    @Test
    void testUploadChunk() {
        // Create mock chunk file
        MockMultipartFile chunkFile = new MockMultipartFile(
            "file",
            "chunk-0",
            "application/octet-stream",
            "test chunk data".getBytes()
        );

        ChunkUploadRequest request = new ChunkUploadRequest();
        request.setPhotoId(testPhoto.getId().getValue());
        request.setChunkNumber(0);
        request.setTotalChunks(1);
        request.setChunkSize(chunkFile.getSize());

        ChunkUploadResponse response = chunkUploadService.uploadChunk(request, chunkFile);

        assertNotNull(response);
        assertEquals(testPhoto.getId().getValue(), response.getPhotoId());
        assertEquals(1, response.getUploadedChunks());
        assertTrue(response.getUploadedChunks().equals(response.getTotalChunks()));
    }

    @Test
    void testUploadChunk_InvalidPhotoId() {
        MockMultipartFile chunkFile = new MockMultipartFile(
            "file",
            "chunk-0",
            "application/octet-stream",
            "test chunk data".getBytes()
        );

        ChunkUploadRequest request = new ChunkUploadRequest();
        request.setPhotoId(UUID.randomUUID()); // Non-existent photo ID
        request.setChunkNumber(0);
        request.setTotalChunks(1);
        request.setChunkSize(chunkFile.getSize());

        assertThrows(IllegalArgumentException.class, () -> {
            chunkUploadService.uploadChunk(request, chunkFile);
        });
    }
}

