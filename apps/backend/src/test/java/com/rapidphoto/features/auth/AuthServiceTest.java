package com.rapidphoto.features.auth;

import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceTest {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Create test user
        String hashedPassword = passwordEncoder.encode("password123");
        testUser = new User(
            com.rapidphoto.domain.user.UserId.generate(),
            new com.rapidphoto.domain.user.Email("test@example.com"),
            "testuser",
            hashedPassword
        );
        userRepository.save(testUser);
    }

    @Test
    void testGenerateToken() {
        String token = jwtService.generateToken(testUser.getId().getValue(), testUser.getEmail().getValue());
        
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void testValidateToken() {
        String token = jwtService.generateToken(testUser.getId().getValue(), testUser.getEmail().getValue());
        
        assertTrue(jwtService.validateToken(token));
    }

    @Test
    void testGetUserIdFromToken() {
        String token = jwtService.generateToken(testUser.getId().getValue(), testUser.getEmail().getValue());
        UUID userId = jwtService.getUserIdFromToken(token);
        
        assertEquals(testUser.getId().getValue(), userId);
    }

    @Test
    void testExtractUserId() {
        String token = jwtService.generateToken(testUser.getId().getValue(), testUser.getEmail().getValue());
        UUID userId = jwtService.getUserIdFromToken(token);
        
        assertEquals(testUser.getId().getValue(), userId);
    }
}

