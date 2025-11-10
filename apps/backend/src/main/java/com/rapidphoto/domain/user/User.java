package com.rapidphoto.domain.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false, unique = true)
    private String username;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "full_name")
    private String fullName;
    
    @Column(name = "storage_quota_bytes", nullable = false)
    private Long storageQuotaBytes;
    
    @Column(name = "storage_used_bytes", nullable = false)
    private Long storageUsedBytes;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @Version
    private Integer version;

    protected User() {} // JPA

    public User(UserId id, Email email, String username, String passwordHash) {
        this.id = id.getValue();
        this.email = email.getValue();
        this.username = Objects.requireNonNull(username);
        this.passwordHash = Objects.requireNonNull(passwordHash);
        this.storageQuotaBytes = 107374182400L; // 100GB
        this.storageUsedBytes = 0L;
        this.status = UserStatus.ACTIVE;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UserId getId() {
        return new UserId(id);
    }

    public Email getEmail() {
        return new Email(email);
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
        this.updatedAt = LocalDateTime.now();
    }

    public StorageQuota getStorageQuota() {
        return new StorageQuota(storageQuotaBytes, storageUsedBytes);
    }

    public UserStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public Integer getVersion() {
        return version;
    }

    public void addStorageUsage(long bytes) {
        StorageQuota quota = getStorageQuota();
        if (!quota.hasSpaceFor(bytes)) {
            throw new IllegalStateException("Storage quota exceeded");
        }
        this.storageUsedBytes += bytes;
        this.updatedAt = LocalDateTime.now();
    }

    public void removeStorageUsage(long bytes) {
        this.storageUsedBytes = Math.max(0, storageUsedBytes - bytes);
        this.updatedAt = LocalDateTime.now();
    }

    public void suspend() {
        this.status = UserStatus.SUSPENDED;
        this.updatedAt = LocalDateTime.now();
    }

    public void activate() {
        this.status = UserStatus.ACTIVE;
        this.updatedAt = LocalDateTime.now();
    }

    public void delete() {
        this.status = UserStatus.DELETED;
        this.updatedAt = LocalDateTime.now();
    }

    public void recordLogin() {
        this.lastLoginAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}

