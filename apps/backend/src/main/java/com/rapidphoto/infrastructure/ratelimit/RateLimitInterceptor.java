package com.rapidphoto.infrastructure.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.rapidphoto.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitInterceptor.class);

    @Autowired
    private Cache<String, Bucket> bucketCache;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Skip rate limiting for health checks and actuator endpoints
        String path = request.getRequestURI();
        if (path.startsWith("/actuator") || path.equals("/health")) {
            return true;
        }

        // Get user ID from authentication context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // For unauthenticated requests, use IP address
            String clientIp = getClientIp(request);
            Bucket bucket = RateLimitConfig.createBucket(bucketCache, "ip:" + clientIp);
            
            if (!bucket.tryConsume(1)) {
                logger.warn("Rate limit exceeded for IP: {}", clientIp);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("X-RateLimit-Limit", "100");
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setHeader("Retry-After", "60");
                response.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return false;
            }
            
            response.setHeader("X-RateLimit-Limit", "100");
            response.setHeader("X-RateLimit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            return true;
        }

        try {
            UUID userId = UUID.fromString(authentication.getName());
            String rateLimitKey = "user:" + userId.toString();
            
            // Determine bucket based on endpoint
            Bucket bucket;
            if (path.startsWith("/api/upload")) {
                bucket = RateLimitConfig.createUploadBucket(bucketCache, rateLimitKey);
            } else {
                bucket = RateLimitConfig.createBucket(bucketCache, rateLimitKey);
            }
            
            if (!bucket.tryConsume(1)) {
                logger.warn("Rate limit exceeded for user: {}", userId);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("X-RateLimit-Limit", path.startsWith("/api/upload") ? "200" : "100");
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setHeader("Retry-After", "60");
                response.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return false;
            }
            
            response.setHeader("X-RateLimit-Limit", path.startsWith("/api/upload") ? "200" : "100");
            response.setHeader("X-RateLimit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            return true;
        } catch (Exception e) {
            logger.error("Error in rate limiting", e);
            // Allow request to proceed if rate limiting fails
            return true;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}

