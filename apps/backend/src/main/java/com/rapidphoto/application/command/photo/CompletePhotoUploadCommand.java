package com.rapidphoto.application.command.photo;

import java.util.UUID;

public class CompletePhotoUploadCommand {
    private final UUID photoId;
    private final String checksumSha256;
    private final Integer width;
    private final Integer height;

    public CompletePhotoUploadCommand(UUID photoId, String checksumSha256, Integer width, Integer height) {
        this.photoId = photoId;
        this.checksumSha256 = checksumSha256;
        this.width = width;
        this.height = height;
    }

    public UUID getPhotoId() {
        return photoId;
    }

    public String getChecksumSha256() {
        return checksumSha256;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }
}

