package com.rapidphoto.features.upload.progress;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class ProgressTracker {

    private final Map<UUID, UploadProgress> progressMap = new ConcurrentHashMap<>();

    public void initializeProgress(UUID photoId, UUID userId, long totalBytes, int totalChunks) {
        UploadProgress progress = new UploadProgress(photoId, userId, totalBytes, totalChunks);
        progressMap.put(photoId, progress);
    }

    public void updateChunkProgress(UUID photoId, int chunkNumber, long chunkSize) {
        UploadProgress progress = progressMap.get(photoId);
        if (progress != null) {
            progress.addUploadedBytes(chunkSize);
            progress.incrementChunkCount();
        }
    }

    public void markCompleted(UUID photoId) {
        UploadProgress progress = progressMap.get(photoId);
        if (progress != null) {
            progress.markCompleted();
        }
    }

    public void markFailed(UUID photoId, String errorMessage) {
        UploadProgress progress = progressMap.get(photoId);
        if (progress != null) {
            progress.markFailed(errorMessage);
        }
    }

    public UploadProgress getProgress(UUID photoId) {
        return progressMap.get(photoId);
    }

    public void removeProgress(UUID photoId) {
        progressMap.remove(photoId);
    }

    public static class UploadProgress {
        private final UUID photoId;
        private final UUID userId;
        private final long totalBytes;
        private final int totalChunks;
        private final AtomicLong uploadedBytes = new AtomicLong(0);
        private int uploadedChunks = 0;
        private String status = "UPLOADING";
        private String errorMessage;

        public UploadProgress(UUID photoId, UUID userId, long totalBytes, int totalChunks) {
            this.photoId = photoId;
            this.userId = userId;
            this.totalBytes = totalBytes;
            this.totalChunks = totalChunks;
        }

        public void addUploadedBytes(long bytes) {
            uploadedBytes.addAndGet(bytes);
        }

        public void incrementChunkCount() {
            uploadedChunks++;
        }

        public void markCompleted() {
            this.status = "COMPLETED";
        }

        public void markFailed(String errorMessage) {
            this.status = "FAILED";
            this.errorMessage = errorMessage;
        }

        public double getPercentage() {
            if (totalBytes == 0) return 0;
            return (double) uploadedBytes.get() / totalBytes * 100;
        }

        // Getters
        public UUID getPhotoId() { return photoId; }
        public UUID getUserId() { return userId; }
        public long getTotalBytes() { return totalBytes; }
        public int getTotalChunks() { return totalChunks; }
        public long getUploadedBytes() { return uploadedBytes.get(); }
        public int getUploadedChunks() { return uploadedChunks; }
        public String getStatus() { return status; }
        public String getErrorMessage() { return errorMessage; }
    }
}

