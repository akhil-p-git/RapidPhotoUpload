package com.rapidphoto.domain.photo;

import java.util.Objects;

public class StorageInfo {
    private final String storagePath;
    private final StorageType storageType;
    private final String s3Bucket;
    private final String s3Key;

    public StorageInfo(String storagePath, StorageType storageType) {
        this(storagePath, storageType, null, null);
    }

    public StorageInfo(String storagePath, StorageType storageType, String s3Bucket, String s3Key) {
        this.storagePath = Objects.requireNonNull(storagePath);
        this.storageType = Objects.requireNonNull(storageType);
        this.s3Bucket = s3Bucket;
        this.s3Key = s3Key;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public StorageType getStorageType() {
        return storageType;
    }

    public String getS3Bucket() {
        return s3Bucket;
    }

    public String getS3Key() {
        return s3Key;
    }

    public boolean isLocal() {
        return storageType == StorageType.LOCAL;
    }

    public boolean isS3() {
        return storageType == StorageType.S3;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StorageInfo that = (StorageInfo) o;
        return Objects.equals(storagePath, that.storagePath) &&
               storageType == that.storageType &&
               Objects.equals(s3Bucket, that.s3Bucket) &&
               Objects.equals(s3Key, that.s3Key);
    }

    @Override
    public int hashCode() {
        return Objects.hash(storagePath, storageType, s3Bucket, s3Key);
    }

    public enum StorageType {
        LOCAL,
        S3
    }
}

