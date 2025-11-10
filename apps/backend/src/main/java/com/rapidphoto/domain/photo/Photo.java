package com.rapidphoto.domain.photo;

import com.rapidphoto.domain.user.UserId;
import com.rapidphoto.domain.upload.UploadSessionId;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "photos")
public class Photo {
    
    @Id
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "upload_session_id")
    private UUID uploadSessionId;
    
    @Column(name = "file_name", nullable = false)
    private String fileName;
    
    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;
    
    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;
    
    @Column(name = "mime_type", nullable = false)
    private String mimeType;
    
    private Integer width;
    private Integer height;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PhotoStatus status;
    
    @Column(name = "storage_path", nullable = false)
    private String storagePath;
    
    @Column(name = "storage_type", nullable = false)
    private String storageType;
    
    @Column(name = "s3_bucket")
    private String s3Bucket;
    
    @Column(name = "s3_key")
    private String s3Key;
    
    @Column(name = "checksum_md5")
    private String checksumMd5;
    
    @Column(name = "checksum_sha256")
    private String checksumSha256;
    
    @Column(name = "perceptual_hash")
    private String perceptualHash;
    
    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
    
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
    
    @Column(name = "metadata", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> metadata;

    @Column(name = "exif_data", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> exifData;

    @Column(name = "ai_tags", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> aiTags;
    
    @Column(name = "location_lat", precision = 10, scale = 8)
    private java.math.BigDecimal locationLat;
    
    @Column(name = "location_lon", precision = 11, scale = 8)
    private java.math.BigDecimal locationLon;
    
    @Column(name = "taken_at")
    private LocalDateTime takenAt;
    
    @Column(name = "thumbnail_small_url")
    private String thumbnailSmallUrl;
    
    @Column(name = "thumbnail_medium_url")
    private String thumbnailMediumUrl;
    
    @Column(name = "thumbnail_large_url")
    private String thumbnailLargeUrl;
    
    @Version
    private Integer version;

    protected Photo() {} // JPA

    public Photo(PhotoId id, UserId userId, String fileName, String originalFileName, 
                 Long fileSizeBytes, String mimeType, String storagePath) {
        this.id = id.getValue();
        this.userId = userId.getValue();
        this.fileName = Objects.requireNonNull(fileName);
        this.originalFileName = Objects.requireNonNull(originalFileName);
        this.fileSizeBytes = Objects.requireNonNull(fileSizeBytes);
        this.mimeType = Objects.requireNonNull(mimeType);
        this.storagePath = Objects.requireNonNull(storagePath);
        this.storageType = "LOCAL";
        this.status = PhotoStatus.UPLOADING;
        this.uploadedAt = LocalDateTime.now();
    }

    public PhotoId getId() {
        return new PhotoId(id);
    }

    public UserId getUserId() {
        return new UserId(userId);
    }

    public UploadSessionId getUploadSessionId() {
        return uploadSessionId != null ? new UploadSessionId(uploadSessionId) : null;
    }

    public void setUploadSessionId(UploadSessionId uploadSessionId) {
        this.uploadSessionId = uploadSessionId != null ? uploadSessionId.getValue() : null;
    }

    public String getFileName() {
        return fileName;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public String getMimeType() {
        return mimeType;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public PhotoStatus getStatus() {
        return status;
    }

    public StorageInfo getStorageInfo() {
        StorageInfo.StorageType type = "S3".equals(storageType) 
            ? StorageInfo.StorageType.S3 
            : StorageInfo.StorageType.LOCAL;
        return new StorageInfo(storagePath, type, s3Bucket, s3Key);
    }

    public void setStorageInfo(StorageInfo storageInfo) {
        this.storagePath = storageInfo.getStoragePath();
        this.storageType = storageInfo.getStorageType().name();
        this.s3Bucket = storageInfo.getS3Bucket();
        this.s3Key = storageInfo.getS3Key();
    }

    public String getChecksumMd5() {
        return checksumMd5;
    }

    public void setChecksumMd5(String checksumMd5) {
        this.checksumMd5 = checksumMd5;
    }

    public String getChecksumSha256() {
        return checksumSha256;
    }

    public void setChecksumSha256(String checksumSha256) {
        this.checksumSha256 = checksumSha256;
    }

    public String getPerceptualHash() {
        return perceptualHash;
    }

    public void setPerceptualHash(String perceptualHash) {
        this.perceptualHash = perceptualHash;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public PhotoMetadata getPhotoMetadata() {
        return new PhotoMetadata(metadata, exifData, aiTags, 
            locationLat != null ? locationLat.doubleValue() : null,
            locationLon != null ? locationLon.doubleValue() : null,
            takenAt);
    }

    public void setPhotoMetadata(PhotoMetadata photoMetadata) {
        this.metadata = photoMetadata.getMetadata();
        this.exifData = photoMetadata.getExifData();
        this.aiTags = photoMetadata.getAiTags();
        this.locationLat = photoMetadata.getLocationLat() != null 
            ? java.math.BigDecimal.valueOf(photoMetadata.getLocationLat()) 
            : null;
        this.locationLon = photoMetadata.getLocationLon() != null 
            ? java.math.BigDecimal.valueOf(photoMetadata.getLocationLon()) 
            : null;
        this.takenAt = photoMetadata.getTakenAt();
    }

    public Integer getVersion() {
        return version;
    }

    public void markAsProcessing() {
        this.status = PhotoStatus.PROCESSING;
    }

    public void markAsCompleted() {
        this.status = PhotoStatus.COMPLETED;
        this.processedAt = LocalDateTime.now();
    }

    public void markAsFailed() {
        this.status = PhotoStatus.FAILED;
    }

    public void delete() {
        this.status = PhotoStatus.DELETED;
    }
    
    public String getThumbnailSmallUrl() {
        return thumbnailSmallUrl;
    }
    
    public void setThumbnailSmallUrl(String thumbnailSmallUrl) {
        this.thumbnailSmallUrl = thumbnailSmallUrl;
    }
    
    public String getThumbnailMediumUrl() {
        return thumbnailMediumUrl;
    }
    
    public void setThumbnailMediumUrl(String thumbnailMediumUrl) {
        this.thumbnailMediumUrl = thumbnailMediumUrl;
    }
    
    public String getThumbnailLargeUrl() {
        return thumbnailLargeUrl;
    }
    
    public void setThumbnailLargeUrl(String thumbnailLargeUrl) {
        this.thumbnailLargeUrl = thumbnailLargeUrl;
    }
}

