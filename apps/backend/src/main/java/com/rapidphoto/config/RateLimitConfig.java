package com.rapidphoto.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Rate limit buckets, built from configuration.
 *
 * These used to be static factory methods with the limits written into the
 * code: 100/minute general and 200/minute for uploads. The rate-limit block in
 * application.yml was never read by anything, so every documented figure for
 * this limit was wrong -- the README said 1000/min, application.yml said
 * 5000/min, API.md said 10/min, and the effective value was 200/min the whole
 * time. Raising the YAML value changed nothing.
 *
 * That matters beyond tidiness: on the presigned path each file costs three
 * requests, so 200/minute is about 66 files per minute, and a 1000-image batch
 * needs roughly fifteen minutes of budget before bandwidth is even considered.
 */
@Configuration
public class RateLimitConfig {

    @Value("${rate-limit.default.capacity:100}")
    private long defaultCapacity;

    @Value("${rate-limit.default.refill-interval:60}")
    private long defaultRefillSeconds;

    @Value("${rate-limit.upload.capacity:5000}")
    private long uploadCapacity;

    @Value("${rate-limit.upload.refill-interval:60}")
    private long uploadRefillSeconds;

    @Bean
    public Cache<String, Bucket> bucketCache() {
        return Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(1))
            .build();
    }

    /** General-purpose bucket, rate-limit.default.*. */
    public Bucket bucketFor(Cache<String, Bucket> bucketCache, String key) {
        return bucketCache.get(key, k -> build(defaultCapacity, defaultRefillSeconds));
    }

    /** Upload-endpoint bucket, rate-limit.upload.*. */
    public Bucket uploadBucketFor(Cache<String, Bucket> bucketCache, String key) {
        return bucketCache.get(key, k -> build(uploadCapacity, uploadRefillSeconds));
    }

    public long getDefaultCapacity() {
        return defaultCapacity;
    }

    public long getUploadCapacity() {
        return uploadCapacity;
    }

    private static Bucket build(long capacity, long refillSeconds) {
        Bandwidth limit = Bandwidth.simple(capacity, Duration.ofSeconds(refillSeconds));
        return Bucket.builder().addLimit(limit).build();
    }
}
