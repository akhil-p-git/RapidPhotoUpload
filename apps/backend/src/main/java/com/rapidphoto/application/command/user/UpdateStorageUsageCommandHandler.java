package com.rapidphoto.application.command.user;

import com.rapidphoto.application.command.CommandHandler;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserId;
import com.rapidphoto.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UpdateStorageUsageCommandHandler implements CommandHandler<UpdateStorageUsageCommand, Void> {

    private final UserRepository userRepository;

    public UpdateStorageUsageCommandHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public Void handle(UpdateStorageUsageCommand command) {
        User user = userRepository.findById(command.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + command.getUserId()));

        if (command.getBytesToAdd() > 0) {
            user.addStorageUsage(command.getBytesToAdd());
        } else if (command.getBytesToAdd() < 0) {
            user.removeStorageUsage(Math.abs(command.getBytesToAdd()));
        }

        userRepository.save(user);
        return null;
    }
}

