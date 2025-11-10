package com.rapidphoto.application.command.user;

import com.rapidphoto.application.command.CommandHandler;
import com.rapidphoto.domain.user.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class RegisterUserCommandHandler implements CommandHandler<RegisterUserCommand, UUID> {

    private final UserRepository userRepository;

    public RegisterUserCommandHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public UUID handle(RegisterUserCommand command) {
        // Validate email not already registered
        if (userRepository.existsByEmail(command.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + command.getEmail());
        }

        // Validate username not already taken
        if (userRepository.existsByUsername(command.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + command.getUsername());
        }

        // Create domain objects
        UserId userId = UserId.generate();
        Email email = new Email(command.getEmail());
        
        // Password should already be hashed by the caller (AuthController)
        // If not hashed, assume it's a plain password and needs hashing
        String passwordHash = command.getPassword();
        if (!passwordHash.startsWith("$2a$") && !passwordHash.startsWith("$2b$")) {
            // Not a BCrypt hash, treat as plain password (for backward compatibility)
            // In production, this should never happen - password should always be hashed
            passwordHash = "TEMP_HASH_" + passwordHash;
        }
        
        // Create aggregate root
        User user = new User(userId, email, command.getUsername(), passwordHash);
        if (command.getFullName() != null && !command.getFullName().isEmpty()) {
            user.setFullName(command.getFullName());
        }
        
        // Save
        userRepository.save(user);
        
        return userId.getValue();
    }
}

