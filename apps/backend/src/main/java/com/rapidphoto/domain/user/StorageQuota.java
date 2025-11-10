package com.rapidphoto.domain.user;

public class StorageQuota {
    private final long quotaBytes;
    private final long usedBytes;

    public StorageQuota(long quotaBytes, long usedBytes) {
        if (quotaBytes < 0) throw new IllegalArgumentException("Quota cannot be negative");
        if (usedBytes < 0) throw new IllegalArgumentException("Used bytes cannot be negative");
        this.quotaBytes = quotaBytes;
        this.usedBytes = usedBytes;
    }

    public static StorageQuota defaultQuota() {
        return new StorageQuota(107374182400L, 0L); // 100GB
    }

    public boolean hasSpaceFor(long bytes) {
        return (usedBytes + bytes) <= quotaBytes;
    }

    public StorageQuota addUsage(long bytes) {
        return new StorageQuota(quotaBytes, usedBytes + bytes);
    }

    public StorageQuota removeUsage(long bytes) {
        long newUsed = Math.max(0, usedBytes - bytes);
        return new StorageQuota(quotaBytes, newUsed);
    }

    public long getQuotaBytes() {
        return quotaBytes;
    }

    public long getUsedBytes() {
        return usedBytes;
    }

    public long getAvailableBytes() {
        return quotaBytes - usedBytes;
    }

    public double getUsagePercentage() {
        if (quotaBytes == 0) return 0.0;
        return (double) usedBytes / quotaBytes * 100;
    }
}

