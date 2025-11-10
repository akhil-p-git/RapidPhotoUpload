package com.rapidphoto.features.user;

import com.rapidphoto.application.command.user.RegisterUserCommand;
import com.rapidphoto.application.command.user.RegisterUserCommandHandler;
import com.rapidphoto.application.dto.UserDto;
import com.rapidphoto.application.query.user.GetUserByIdQuery;
import com.rapidphoto.application.query.user.GetUserByIdQueryHandler;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final RegisterUserCommandHandler registerUserHandler;
    private final GetUserByIdQueryHandler getUserHandler;
    private final UserRepository userRepository;

    public UserController(RegisterUserCommandHandler registerUserHandler,
                         GetUserByIdQueryHandler getUserHandler,
                         UserRepository userRepository) {
        this.registerUserHandler = registerUserHandler;
        this.getUserHandler = getUserHandler;
        this.userRepository = userRepository;
    }

    /**
     * Register a new user (temporary - for testing)
     */
    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody RegisterUserRequest request) {
        logger.info("Register user request: email={}, username={}", request.getEmail(), request.getUsername());

        try {
            RegisterUserCommand command = new RegisterUserCommand(
                request.getEmail(),
                request.getUsername(),
                request.getPassword(),
                request.getFullName()
            );

            UUID userId = registerUserHandler.handle(command);

            // Fetch the created user to return full details
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User created but not found: " + userId));

            UserResponse response = new UserResponse(
                user.getId().getValue(),
                user.getEmail().getValue(),
                user.getUsername(),
                user.getFullName(),
                user.getStorageQuota().getQuotaBytes(),
                user.getStorageQuota().getUsedBytes()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid registration request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Registration failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID userId) {
        logger.info("Get user request: userId={}", userId);

        try {
            GetUserByIdQuery query = new GetUserByIdQuery(userId);
            UserDto dto = getUserHandler.handle(query);

            UserResponse response = new UserResponse(
                dto.getId(),
                dto.getEmail(),
                dto.getUsername(),
                dto.getFullName(),
                dto.getStorageQuotaBytes(),
                dto.getStorageUsedBytes()
            );

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("User not found: {}", userId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Failed to get user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

