package com.rapidphoto.application.dto;

public class StorageStatsDto {
    private long quotaBytes;
    private long usedBytes;
    private long availableBytes;
    private double usagePercentage;

    public StorageStatsDto(long quotaBytes, long usedBytes) {
        this.quotaBytes = quotaBytes;
        this.usedBytes = usedBytes;
        this.availableBytes = quotaBytes - usedBytes;
        this.usagePercentage = quotaBytes > 0 ? ((double) usedBytes / quotaBytes) * 100 : 0.0;
    }

    // Getters
    public long getQuotaBytes() { return quotaBytes; }
    public long getUsedBytes() { return usedBytes; }
    public long getAvailableBytes() { return availableBytes; }
    public double getUsagePercentage() { return usagePercentage; }
}

