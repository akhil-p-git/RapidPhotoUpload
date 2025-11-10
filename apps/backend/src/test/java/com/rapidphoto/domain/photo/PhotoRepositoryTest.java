package com.rapidphoto.domain.photo;

import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Transactional
class PhotoRepositoryTest {

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
            PhotoId.generate(),
            testUser.getId(),
            "test.jpg",
            "test.jpg",
            1024L,
            "image/jpeg",
            "uploads/test.jpg"
        );
        testPhoto.markAsCompleted();
        photoRepository.save(testPhoto);
    }

    @Test
    void testFindByIdAndUserId() {
        Optional<Photo> found = photoRepository.findByIdAndUserId(
            testPhoto.getId().getValue(),
            testUser.getId().getValue()
        );

        assertTrue(found.isPresent());
        assertEquals(testPhoto.getId().getValue(), found.get().getId().getValue());
    }

    @Test
    void testFindByUserIdAndStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Photo> photos = photoRepository.findByUserIdAndStatusOrderByUploadedAtDesc(
            testUser.getId().getValue(),
            PhotoStatus.COMPLETED,
            pageable
        );

        assertEquals(1, photos.getTotalElements());
        assertEquals(testPhoto.getId().getValue(), photos.getContent().get(0).getId().getValue());
    }

    @Test
    void testFindByUserId() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Photo> photos = photoRepository.findByUserIdOrderByUploadedAtDesc(
            testUser.getId().getValue(),
            pageable
        );

        assertEquals(1, photos.getTotalElements());
    }

    @Test
    void testCountByUserId() {
        long count = photoRepository.countByUserId(testUser.getId().getValue());
        assertEquals(1, count);
    }
}

