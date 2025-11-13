package com.rapidphoto.infrastructure.storage;

import java.io.InputStream;
import java.time.Duration;

public interface StorageService {
    
    /**
     * Store a file
     * @param path Storage path (key)
     * @param inputStream File data
     * @param contentType MIME type
     * @param contentLength File size
     * @return Storage URL
     */
    String store(String path, InputStream inputStream, String contentType, long contentLength);
    
    /**
     * Retrieve a file
     * @param path Storage path (key)
     * @return File data as InputStream
     */
    InputStream retrieve(String path);
    
    /**
     * Delete a file
     * @param path Storage path (key)
     */
    void delete(String path);
    
    /**
     * Check if file exists
     * @param path Storage path (key)
     * @return true if exists
     */
    boolean exists(String path);
    
    /**
     * Get storage type identifier
     */
    String getStorageType();
    
    /**
     * Generate presigned URL for direct client upload
     * @param path Storage path (key)
     * @param duration URL expiration duration
     * @return Presigned URL for PUT operation
     */
    default String generatePresignedUploadUrl(String path, Duration duration) {
        throw new UnsupportedOperationException("Presigned URLs not supported for " + getStorageType());
    }
}

