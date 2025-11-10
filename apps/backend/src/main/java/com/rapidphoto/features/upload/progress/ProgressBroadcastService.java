package com.rapidphoto.features.upload.progress;

import com.rapidphoto.infrastructure.websocket.UploadProgressMessage;
import com.rapidphoto.infrastructure.websocket.UploadProgressWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ProgressBroadcastService {

    private static final Logger logger = LoggerFactory.getLogger(ProgressBroadcastService.class);

    private final UploadProgressWebSocketHandler webSocketHandler;
    private final ProgressTracker progressTracker;

    public ProgressBroadcastService(UploadProgressWebSocketHandler webSocketHandler,
                                   ProgressTracker progressTracker) {
        this.webSocketHandler = webSocketHandler;
        this.progressTracker = progressTracker;
    }

    @Async
    public void broadcastProgress(UUID photoId) {
        ProgressTracker.UploadProgress progress = progressTracker.getProgress(photoId);
        if (progress == null) {
            logger.warn("No progress found for photo: {}", photoId);
            return;
        }

        UploadProgressMessage message = new UploadProgressMessage(
            progress.getPhotoId(),
            progress.getUserId(),
            progress.getStatus()
        );
        
        message.setUploadedBytes(progress.getUploadedBytes());
        message.setTotalBytes(progress.getTotalBytes());
        message.setPercentage(progress.getPercentage());
        message.setUploadedChunks(progress.getUploadedChunks());
        message.setTotalChunks(progress.getTotalChunks());
        message.setMessage(String.format("Uploaded %d/%d chunks (%.1f%%)",
            progress.getUploadedChunks(),
            progress.getTotalChunks(),
            progress.getPercentage()));

        webSocketHandler.broadcastProgress(message);
        
        logger.debug("Broadcast progress for photo: {}, status: {}, progress: {}%",
            photoId, progress.getStatus(), String.format("%.1f", progress.getPercentage()));
    }

    public void broadcastChunkUploaded(UUID photoId, int chunkNumber, long chunkSize) {
        progressTracker.updateChunkProgress(photoId, chunkNumber, chunkSize);
        broadcastProgress(photoId);
    }

    public void broadcastUploadCompleted(UUID photoId) {
        progressTracker.markCompleted(photoId);
        broadcastProgress(photoId);
    }

    public void broadcastUploadFailed(UUID photoId, String errorMessage) {
        progressTracker.markFailed(photoId, errorMessage);
        broadcastProgress(photoId);
    }
}

