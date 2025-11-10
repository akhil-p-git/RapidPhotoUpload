package com.rapidphoto.features.auth;

import com.rapidphoto.application.command.user.RegisterUserCommand;
import com.rapidphoto.application.command.user.RegisterUserCommandHandler;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import com.rapidphoto.features.user.UserResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository userRepository;
    private final RegisterUserCommandHandler registerUserHandler;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Autowired
    public AuthController(
            UserRepository userRepository,
            RegisterUserCommandHandler registerUserHandler,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.registerUserHandler = registerUserHandler;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Register a new user account
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        logger.info("Register request: email={}, username={}", request.getEmail(), request.getUsername());

        try {
            // Check if email already exists
            if (userRepository.existsByEmail(request.getEmail())) {
                Map<String, Object> response = new HashMap<>();
                response.put("error", "Email already registered");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Check if username already exists
            if (userRepository.existsByUsername(request.getUsername())) {
                Map<String, Object> response = new HashMap<>();
                response.put("error", "Username already taken");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Hash password
            String passwordHash = passwordEncoder.encode(request.getPassword());

            // Create user command
            RegisterUserCommand command = new RegisterUserCommand(
                request.getEmail(),
                request.getUsername(),
                passwordHash, // Already hashed
                request.getFullName()
            );

            // Register user (but we need to update the handler to not hash again)
            UUID userId = registerUserHandler.handle(command);

            // Fetch created user
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User created but not found: " + userId));

            // Generate JWT token
            String token = jwtService.generateToken(user.getId().getValue(), user.getEmail().getValue());

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", new UserResponse(
                user.getId().getValue(),
                user.getEmail().getValue(),
                user.getUsername(),
                user.getFullName(),
                user.getStorageQuota().getQuotaBytes(),
                user.getStorageQuota().getUsedBytes()
            ));

            logger.info("User registered successfully: userId={}, email={}", userId, request.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid registration request: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Registration failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Registration failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Login with email and password
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        logger.info("Login request: email={}", request.getEmail());

        try {
            // TEMPORARY: Auto-login bypass for development
            // Find user by email OR use test user if not found
            User user = userRepository.findByEmail(request.getEmail())
                .or(() -> userRepository.findByEmail("test@rapidphoto.com"))
                .orElseThrow(() -> new IllegalArgumentException("No users found"));

            // COMMENTED OUT: Password verification (bypassed for dev)
            // if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            //     logger.warn("Invalid password for user: {}", request.getEmail());
            //     Map<String, Object> response = new HashMap<>();
            //     response.put("error", "Invalid email or password");
            //     return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            // }

            // COMMENTED OUT: Active user check (bypassed for dev)
            // if (user.getStatus().name().equals("DELETED") || user.getStatus().name().equals("SUSPENDED")) {
            //     Map<String, Object> response = new HashMap<>();
            //     response.put("error", "Account is not active");
            //     return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            // }

            // COMMENTED OUT: Authentication (bypassed for dev)
            // Authentication authentication = authenticationManager.authenticate(
            //     new UsernamePasswordAuthenticationToken(
            //         request.getEmail(),
            //         request.getPassword()
            //     )
            // );
            // SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate JWT token
            String token = jwtService.generateToken(user.getId().getValue(), user.getEmail().getValue());

            // Update last login
            user.recordLogin();
            userRepository.save(user);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", new UserResponse(
                user.getId().getValue(),
                user.getEmail().getValue(),
                user.getUsername(),
                user.getFullName(),
                user.getStorageQuota().getQuotaBytes(),
                user.getStorageQuota().getUsedBytes()
            ));

            logger.info("User logged in successfully: userId={}, email={}", user.getId().getValue(), request.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid login request: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (Exception e) {
            logger.error("Login failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Login failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Logout (client-side token removal)
     * For stateless JWT, logout is handled client-side by removing the token
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        // For stateless JWT, logout is handled client-side
        // In a production system, you might want to maintain a token blacklist
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Get current user info from token
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String userIdStr = authentication.getName();
            UUID userId = UUID.fromString(userIdStr);

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

            UserResponse response = new UserResponse(
                user.getId().getValue(),
                user.getEmail().getValue(),
                user.getUsername(),
                user.getFullName(),
                user.getStorageQuota().getQuotaBytes(),
                user.getStorageQuota().getUsedBytes()
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to get current user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

