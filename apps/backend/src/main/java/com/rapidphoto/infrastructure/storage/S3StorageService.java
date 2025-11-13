package com.rapidphoto.infrastructure.storage;

import com.rapidphoto.infrastructure.retry.ExponentialBackoffRetryService;
import com.rapidphoto.infrastructure.retry.RetryPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.InputStream;
import java.time.Duration;

@Service
@ConditionalOnProperty(name = "storage.type", havingValue = "s3")
public class S3StorageService implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final ExponentialBackoffRetryService retryService;

    @Value("${storage.s3.bucket-name}")
    private String bucketName;

    public S3StorageService(S3Client s3Client, 
                           S3Presigner s3Presigner,
                           ExponentialBackoffRetryService retryService) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.retryService = retryService;
    }

    @Override
    public String store(String path, InputStream inputStream, String contentType, long contentLength) {
        return retryService.executeWithRetry(
            "S3-Store-" + path,
            () -> {
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build();

                s3Client.putObject(
                    putObjectRequest,
                    RequestBody.fromInputStream(inputStream, contentLength)
                );

                logger.info("Stored file in S3: bucket={}, key={}", bucketName, path);
                return String.format("s3://%s/%s", bucketName, path);
            },
            RetryPolicy.aggressivePolicy()
        );
    }

    @Override
    public InputStream retrieve(String path) {
        return retryService.executeWithRetry(
            "S3-Retrieve-" + path,
            () -> {
                GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();

                return s3Client.getObject(getObjectRequest);
            },
            RetryPolicy.defaultPolicy()
        );
    }

    @Override
    public void delete(String path) {
        retryService.executeWithRetry(
            "S3-Delete-" + path,
            () -> {
                DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();

                s3Client.deleteObject(deleteObjectRequest);
                logger.info("Deleted file from S3: bucket={}, key={}", bucketName, path);
                return null;
            },
            RetryPolicy.defaultPolicy()
        );
    }

    @Override
    public boolean exists(String path) {
        return retryService.executeWithRetry(
            "S3-Exists-" + path,
            () -> {
                try {
                    HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                        .bucket(bucketName)
                        .key(path)
                        .build();

                    s3Client.headObject(headObjectRequest);
                    return true;
                } catch (NoSuchKeyException e) {
                    return false;
                }
            },
            RetryPolicy.defaultPolicy()
        );
    }

    @Override
    public String getStorageType() {
        return "S3";
    }

    /**
     * Generate presigned URL for direct client upload
     */
    @Override
    public String generatePresignedUploadUrl(String path, Duration duration) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(path)
                .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(duration)
                    .putObjectRequest(putObjectRequest)
                    .build();

            return s3Presigner.presignPutObject(presignRequest).url().toString();
            
        } catch (S3Exception e) {
            throw new StorageException("Failed to generate presigned upload URL: " + path, e);
        }
    }

    /**
     * Generate presigned URL for file download
     */
    public String generatePresignedDownloadUrl(String path, Duration duration) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(path)
                .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(duration)
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return presignedRequest.url().toString();
            
        } catch (S3Exception e) {
            throw new StorageException("Failed to generate presigned download URL: " + path, e);
        }
    }
}

