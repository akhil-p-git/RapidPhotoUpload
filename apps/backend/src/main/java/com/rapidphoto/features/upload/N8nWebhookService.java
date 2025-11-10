package com.rapidphoto.features.upload;

import com.rapidphoto.domain.photo.Photo;
import com.rapidphoto.infrastructure.retry.ExponentialBackoffRetryService;
import com.rapidphoto.infrastructure.retry.RetryPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
public class N8nWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(N8nWebhookService.class);

    private final RestTemplate restTemplate;
    private final Executor webhookExecutor;
    private final ExponentialBackoffRetryService retryService;

    @Value("${n8n.base-url}")
    private String n8nBaseUrl;

    @Value("${n8n.webhook.photo-uploaded}")
    private String photoUploadedWebhook;

    @Value("${n8n.webhook.photo-processed}")
    private String photoProcessedWebhook;

    @Value("${n8n.webhook.upload-failed}")
    private String uploadFailedWebhook;

    public N8nWebhookService(RestTemplate restTemplate,
                            @Qualifier("webhookExecutor") Executor webhookExecutor,
                            ExponentialBackoffRetryService retryService) {
        this.restTemplate = restTemplate;
        this.webhookExecutor = webhookExecutor;
        this.retryService = retryService;
    }

    @Async("webhookExecutor")
    public CompletableFuture<Void> triggerPhotoUploadedWebhook(UUID photoId, UUID userId, 
                                                                String fileName, long fileSizeBytes,
                                                                String storageLocation) {
        retryService.executeWithRetryAsync(
            "N8N-Webhook-" + photoId,
            () -> {
                String webhookUrl = n8nBaseUrl + photoUploadedWebhook;
                
                Map<String, Object> payload = new HashMap<>();
                payload.put("photoId", photoId.toString());
                payload.put("userId", userId.toString());
                payload.put("fileName", fileName);
                payload.put("fileSizeBytes", fileSizeBytes);
                payload.put("storageLocation", storageLocation);
                payload.put("timestamp", LocalDateTime.now().toString());
                payload.put("eventType", "PHOTO_UPLOADED");

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

                logger.info("Triggering n8n webhook for photo: {} [Thread: {}]", 
                    photoId, Thread.currentThread().getName());
                
                ResponseEntity<String> response = restTemplate.postForEntity(
                    webhookUrl,
                    request,
                    String.class
                );

                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Successfully triggered n8n webhook for photo: {}", photoId);
                } else {
                    throw new RuntimeException("n8n webhook returned non-2xx status: " + response.getStatusCode());
                }
                
                return null;
            },
            RetryPolicy.webhookPolicy(),
            (attemptNumber, delay, exception) -> {
                logger.warn("Retrying n8n webhook for photo: {} (attempt {}, delay: {}ms)",
                    photoId, attemptNumber, delay.toMillis());
            }
        );

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Notify n8n that a photo has been uploaded
     * Convenience method that takes a Photo object
     */
    @Async("webhookExecutor")
    public CompletableFuture<Void> notifyPhotoUploaded(Photo photo) {
        String storagePath = photo.getStorageInfo().getStoragePath();
        return triggerPhotoUploadedWebhook(
            photo.getId().getValue(),
            photo.getUserId().getValue(),
            photo.getFileName(),
            photo.getFileSizeBytes(),
            storagePath
        );
    }

    /**
     * Notify n8n that a photo has been processed
     */
    @Async("webhookExecutor")
    public CompletableFuture<Void> notifyPhotoProcessed(Photo photo) {
        return retryService.executeWithRetryAsync(
            "N8N-Webhook-Processed-" + photo.getId().getValue(),
            () -> {
                String webhookUrl = n8nBaseUrl + photoProcessedWebhook;
                
                Map<String, Object> payload = new HashMap<>();
                payload.put("photoId", photo.getId().getValue().toString());
                payload.put("userId", photo.getUserId().getValue().toString());
                payload.put("fileName", photo.getFileName());
                payload.put("status", photo.getStatus().name());
                payload.put("processedAt", photo.getProcessedAt() != null ? photo.getProcessedAt().toString() : null);
                payload.put("timestamp", LocalDateTime.now().toString());
                payload.put("eventType", "PHOTO_PROCESSED");

                // Include metadata if available
                com.rapidphoto.domain.photo.PhotoMetadata metadata = photo.getPhotoMetadata();
                if (metadata != null) {
                    payload.put("hasExifData", metadata.hasExifData());
                    payload.put("hasAiTags", metadata.hasAiTags());
                    payload.put("hasLocation", metadata.hasLocation());
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

                logger.info("Triggering n8n webhook for processed photo: {} [Thread: {}]", 
                    photo.getId().getValue(), Thread.currentThread().getName());
                
                ResponseEntity<String> response = restTemplate.postForEntity(
                    webhookUrl,
                    request,
                    String.class
                );

                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Successfully triggered n8n webhook for processed photo: {}", photo.getId().getValue());
                } else {
                    throw new RuntimeException("n8n webhook returned non-2xx status: " + response.getStatusCode());
                }
                
                return null;
            },
            RetryPolicy.webhookPolicy(),
            (attemptNumber, delay, exception) -> {
                logger.warn("Retrying n8n webhook for processed photo: {} (attempt {}, delay: {}ms)",
                    photo.getId().getValue(), attemptNumber, delay.toMillis());
            }
        );
    }

    /**
     * Notify n8n that an upload has failed
     */
    @Async("webhookExecutor")
    public CompletableFuture<Void> notifyUploadFailed(Photo photo, String error) {
        return retryService.executeWithRetryAsync(
            "N8N-Webhook-Failed-" + photo.getId().getValue(),
            () -> {
                String webhookUrl = n8nBaseUrl + uploadFailedWebhook;
                
                Map<String, Object> payload = new HashMap<>();
                payload.put("photoId", photo.getId().getValue().toString());
                payload.put("userId", photo.getUserId().getValue().toString());
                payload.put("fileName", photo.getFileName());
                payload.put("status", photo.getStatus().name());
                payload.put("error", error);
                payload.put("timestamp", LocalDateTime.now().toString());
                payload.put("eventType", "UPLOAD_FAILED");

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

                logger.info("Triggering n8n webhook for failed upload: {} [Thread: {}]", 
                    photo.getId().getValue(), Thread.currentThread().getName());
                
                ResponseEntity<String> response = restTemplate.postForEntity(
                    webhookUrl,
                    request,
                    String.class
                );

                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Successfully triggered n8n webhook for failed upload: {}", photo.getId().getValue());
                } else {
                    throw new RuntimeException("n8n webhook returned non-2xx status: " + response.getStatusCode());
                }
                
                return null;
            },
            RetryPolicy.webhookPolicy(),
            (attemptNumber, delay, exception) -> {
                logger.warn("Retrying n8n webhook for failed upload: {} (attempt {}, delay: {}ms)",
                    photo.getId().getValue(), attemptNumber, delay.toMillis());
            }
        );
    }
}

