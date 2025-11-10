package com.rapidphoto.application.command.photo;

import com.rapidphoto.application.command.CommandHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoId;
import com.rapidphoto.domain.photo.PhotoRepository;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserId;
import com.rapidphoto.domain.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.UUID;

@Service
public class StartPhotoUploadCommandHandler implements CommandHandler<StartPhotoUploadCommand, UUID> {

    private static final Logger logger = LoggerFactory.getLogger(StartPhotoUploadCommandHandler.class);
    private static final int MAX_RETRIES = 10; // Increased for high concurrency
    private static final long BASE_RETRY_DELAY_MS = 100; // Base delay in milliseconds

    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public StartPhotoUploadCommandHandler(PhotoRepository photoRepository, UserRepository userRepository) {
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
    }

    @Override
    public UUID handle(StartPhotoUploadCommand command) {
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return executeUpload(command);
            } catch (ObjectOptimisticLockingFailureException e) {
                if (attempt < MAX_RETRIES) {
                    logger.warn("Optimistic locking failure for user {}, attempt {}/{}. Retrying...",
                        command.getUserId(), attempt + 1, MAX_RETRIES);

                    // Clear entity manager to ensure fresh entity on retry
                    entityManager.clear();

                    // Exponential backoff with jitter to prevent thundering herd
                    long exponentialDelay = BASE_RETRY_DELAY_MS * (1L << attempt); // 2^attempt
                    long jitter = (long) (Math.random() * BASE_RETRY_DELAY_MS); // Random jitter up to base delay
                    long totalDelay = Math.min(exponentialDelay + jitter, 2000); // Cap at 2 seconds
                    
                    try {
                        Thread.sleep(totalDelay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Upload interrupted", ie);
                    }
                } else {
                    logger.error("Optimistic locking failure for user {} after {} attempts",
                        command.getUserId(), MAX_RETRIES);
                    throw new RuntimeException("Failed to update user storage after " + MAX_RETRIES + " attempts", e);
                }
            }
        }
        throw new RuntimeException("Upload failed after all retries");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected UUID executeUpload(StartPhotoUploadCommand command) {
        // Validate user exists
        User user = userRepository.findById(command.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + command.getUserId()));

        // Check storage quota
        if (!user.getStorageQuota().hasSpaceFor(command.getFileSizeBytes())) {
            throw new IllegalStateException("Storage quota exceeded");
        }

        // Create photo aggregate
        PhotoId photoId = PhotoId.generate();
        UserId userId = new UserId(command.getUserId());
        String storagePath = command.getUserId() + "/" + command.getFileName();

        Photo photo = new Photo(
            photoId,
            userId,
            command.getFileName(),
            command.getOriginalFileName(),
            command.getFileSizeBytes(),
            command.getMimeType(),
            storagePath
        );

        // Save photo
        photoRepository.save(photo);

        // Update user storage usage
        user.addStorageUsage(command.getFileSizeBytes());
        userRepository.save(user);

        return photoId.getValue();
    }
}

