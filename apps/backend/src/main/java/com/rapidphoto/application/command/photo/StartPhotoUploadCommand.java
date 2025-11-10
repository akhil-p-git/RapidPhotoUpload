package com.rapidphoto.application.command.photo;

import java.util.UUID;

public class StartPhotoUploadCommand {
    private final UUID userId;
    private final String fileName;
    private final String originalFileName;
    private final long fileSizeBytes;
    private final String mimeType;

    public StartPhotoUploadCommand(UUID userId, String fileName, String originalFileName,
                                   long fileSizeBytes, String mimeType) {
        this.userId = userId;
        this.fileName = fileName;
        this.originalFileName = originalFileName;
        this.fileSizeBytes = fileSizeBytes;
        this.mimeType = mimeType;
    }

    public UUID getUserId() { return userId; }
    public String getFileName() { return fileName; }
    public String getOriginalFileName() { return originalFileName; }
    public long getFileSizeBytes() { return fileSizeBytes; }
    public String getMimeType() { return mimeType; }
}

