package com.rapidphoto.features.gallery;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.photo.PhotoStatus;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import com.rapidphoto.features.auth.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PhotoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;


    private User testUser;
    private String authToken;

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

        // Generate JWT token
        authToken = jwtService.generateToken(testUser.getId().getValue(), testUser.getEmail().getValue());
    }

    @Test
    void testGetPhotos_Unauthenticated() throws Exception {
        mockMvc.perform(get("/api/photos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void testGetPhotos_Authenticated() throws Exception {
        // Create test photo
        Photo photo = new Photo(
            com.rapidphoto.domain.photo.PhotoId.generate(),
            testUser.getId(),
            "test.jpg",
            "test.jpg",
            1024L,
            "image/jpeg",
            "uploads/test.jpg"
        );
        photo.markAsCompleted();
        photoRepository.save(photo);

        mockMvc.perform(get("/api/photos")
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void testGetPhoto_NotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        
        mockMvc.perform(get("/api/photos/" + nonExistentId)
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void testDeletePhoto() throws Exception {
        // Create test photo
        Photo photo = new Photo(
            com.rapidphoto.domain.photo.PhotoId.generate(),
            testUser.getId(),
            "test.jpg",
            "test.jpg",
            1024L,
            "image/jpeg",
            "uploads/test.jpg"
        );
        photo.markAsCompleted();
        photoRepository.save(photo);

        mockMvc.perform(delete("/api/photos/" + photo.getId().getValue())
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isNoContent());

        // Verify photo is soft deleted
        Photo deletedPhoto = photoRepository.findById(photo.getId().getValue()).orElseThrow();
        assert deletedPhoto.getStatus() == PhotoStatus.DELETED;
    }
}

