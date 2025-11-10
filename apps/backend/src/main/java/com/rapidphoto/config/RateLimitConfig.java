package com.rapidphoto.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Bean
    public Cache<String, Bucket> bucketCache() {
        return Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(1))
            .build();
    }

    /**
     * Create a bucket with rate limiting configuration
     * Default: 100 requests per minute per user
     */
    public static Bucket createBucket(Cache<String, Bucket> bucketCache, String key) {
        return bucketCache.get(key, k -> {
            Bandwidth limit = Bandwidth.simple(100, Duration.ofMinutes(1));
            return Bucket.builder()
                .addLimit(limit)
                .build();
        });
    }

    /**
     * Create a bucket for upload endpoints
     * Default: 200 uploads per minute per user (allows bulk uploads)
     */
    public static Bucket createUploadBucket(Cache<String, Bucket> bucketCache, String key) {
        return bucketCache.get(key, k -> {
            Bandwidth limit = Bandwidth.simple(200, Duration.ofMinutes(1));
            return Bucket.builder()
                .addLimit(limit)
                .build();
        });
    }
}

