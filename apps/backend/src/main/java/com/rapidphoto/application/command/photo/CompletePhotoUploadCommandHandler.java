package com.rapidphoto.application.command.photo;

import com.rapidphoto.application.command.CommandHandler;
import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.domain.photo.PhotoId;
import com.rapidphoto.domain.photo.PhotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class CompletePhotoUploadCommandHandler implements CommandHandler<CompletePhotoUploadCommand, Void> {

    private final PhotoRepository photoRepository;

    public CompletePhotoUploadCommandHandler(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    @Override
    @Transactional
    public Void handle(CompletePhotoUploadCommand command) {
        Photo photo = photoRepository.findById(command.getPhotoId())
            .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + command.getPhotoId()));

        // Set checksum
        if (command.getChecksumSha256() != null) {
            photo.setChecksumSha256(command.getChecksumSha256());
        }

        // Set dimensions
        if (command.getWidth() != null) {
            photo.setWidth(command.getWidth());
        }
        if (command.getHeight() != null) {
            photo.setHeight(command.getHeight());
        }

        // Mark as processing (will be completed by processing job)
        photo.markAsProcessing();

        photoRepository.save(photo);
        return null;
    }
}

