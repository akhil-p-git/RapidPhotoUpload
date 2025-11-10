package com.rapidphoto.infrastructure.retry;

import java.time.Duration;

public class RetryPolicy {
    private final int maxAttempts;
    private final Duration initialDelay;
    private final Duration maxDelay;
    private final double backoffMultiplier;

    public RetryPolicy(int maxAttempts, Duration initialDelay, Duration maxDelay, double backoffMultiplier) {
        this.maxAttempts = maxAttempts;
        this.initialDelay = initialDelay;
        this.maxDelay = maxDelay;
        this.backoffMultiplier = backoffMultiplier;
    }

    public static RetryPolicy defaultPolicy() {
        return new RetryPolicy(
            3,                              // 3 attempts
            Duration.ofSeconds(1),          // Initial delay: 1s
            Duration.ofSeconds(30),         // Max delay: 30s
            2.0                             // Double each retry
        );
    }

    public static RetryPolicy aggressivePolicy() {
        return new RetryPolicy(
            5,                              // 5 attempts
            Duration.ofMillis(500),         // Initial delay: 500ms
            Duration.ofSeconds(60),         // Max delay: 60s
            2.0
        );
    }

    public static RetryPolicy webhookPolicy() {
        return new RetryPolicy(
            3,                              // 3 attempts
            Duration.ofSeconds(2),          // Initial delay: 2s
            Duration.ofSeconds(15),         // Max delay: 15s
            1.5                             // 1.5x backoff
        );
    }

    public Duration calculateDelay(int attemptNumber) {
        if (attemptNumber <= 1) {
            return initialDelay;
        }
        
        long delayMs = (long) (initialDelay.toMillis() * Math.pow(backoffMultiplier, attemptNumber - 1));
        Duration calculatedDelay = Duration.ofMillis(delayMs);
        
        return calculatedDelay.compareTo(maxDelay) > 0 ? maxDelay : calculatedDelay;
    }

    // Getters
    public int getMaxAttempts() { return maxAttempts; }
    public Duration getInitialDelay() { return initialDelay; }
    public Duration getMaxDelay() { return maxDelay; }
    public double getBackoffMultiplier() { return backoffMultiplier; }
}

