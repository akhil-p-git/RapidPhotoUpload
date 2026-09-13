package com.rapidphoto.infrastructure.storage;

import java.io.InputStream;
import java.time.Duration;
import java.util.Optional;

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

    /**
     * Generate a presigned upload URL that is only valid for a body of exactly
     * contentLength bytes and the given content type.
     *
     * Both values are signed, so a client that sends anything else fails the
     * signature check at the store rather than succeeding and leaving the
     * mismatch to be discovered afterwards. Implementations that cannot bind
     * these fall back to the unconstrained form -- callers must therefore still
     * verify the stored object once the upload completes.
     */
    default String generatePresignedUploadUrl(String path, Duration duration,
                                              long contentLength, String contentType) {
        return generatePresignedUploadUrl(path, duration);
    }

    /**
     * Size and content type of a stored object, or empty when it is absent.
     */
    default Optional<StoredObject> head(String path) {
        return Optional.empty();
    }

    /**
     * First maxBytes of an object, for content sniffing. Returns fewer bytes if
     * the object is shorter.
     */
    default byte[] readPrefix(String path, int maxBytes) {
        try (InputStream in = retrieve(path)) {
            return in.readNBytes(maxBytes);
        } catch (Exception e) {
            throw new StorageException("Failed to read prefix of: " + path, e);
        }
    }
}

