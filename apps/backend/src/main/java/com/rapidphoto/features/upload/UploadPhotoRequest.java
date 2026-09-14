package com.rapidphoto.features.upload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Body of POST /api/upload/initialize.
 *
 * Deliberately carries no userId: the owner is derived from the authenticated
 * principal and passed separately. It used to be a @NotNull field that the
 * controller overwrote from the JWT -- but @Valid runs during argument binding,
 * before any controller code, so every request from a client that (correctly)
 * did not send a userId was rejected with 400 and the overwrite was unreachable.
 * Mirrors PresignedUploadRequest, which has always had this shape.
 */
public class UploadPhotoRequest {

    @NotBlank(message = "Original file name is required")
    private String originalFileName;

    @NotBlank(message = "MIME type is required")
    private String mimeType;

    @NotNull(message = "File size is required")
    @Positive(message = "File size must be positive")
    private Long fileSizeBytes;

    public UploadPhotoRequest() {}

    public UploadPhotoRequest(String originalFileName, String mimeType, Long fileSizeBytes) {
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
}
