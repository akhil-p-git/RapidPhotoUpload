package com.rapidphoto.infrastructure.retry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class ExponentialBackoffRetryService {

    private static final Logger logger = LoggerFactory.getLogger(ExponentialBackoffRetryService.class);

    public <T> T executeWithRetry(
            String operationName,
            RetryableOperation<T> operation,
            RetryPolicy policy) {
        
        RetryContext context = new RetryContext(operationName);
        
        while (true) {
            try {
                if (context.getAttemptNumber() > 0) {
                    Duration delay = policy.calculateDelay(context.getAttemptNumber());
                    logger.info("Retrying operation: {} (attempt {}/{}), waiting {}ms",
                        operationName,
                        context.getAttemptNumber() + 1,
                        policy.getMaxAttempts(),
                        delay.toMillis());
                    Thread.sleep(delay.toMillis());
                }

                T result = operation.execute();
                
                if (context.getAttemptNumber() > 0) {
                    logger.info("Operation succeeded after {} retries: {}", 
                        context.getAttemptNumber(), operationName);
                }
                
                return result;
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("Operation interrupted: {}", operationName, e);
                throw new RuntimeException("Operation interrupted", e);
                
            } catch (Exception e) {
                context.recordAttempt(e);
                
                if (!context.shouldRetry(policy)) {
                    logger.error("Operation failed after {} attempts: {}", 
                        context.getAttemptNumber(), operationName, e);
                    throw new RuntimeException(
                        String.format("Operation failed after %d attempts: %s", 
                            context.getAttemptNumber(), e.getMessage()), 
                        e
                    );
                }
                
                logger.warn("Operation failed (attempt {}/{}): {} - {}",
                    context.getAttemptNumber(),
                    policy.getMaxAttempts(),
                    operationName,
                    e.getMessage());
            }
        }
    }

    /**
     * Execute async operation with retry
     */
    public <T> T executeWithRetryAsync(
            String operationName,
            RetryableOperation<T> operation,
            RetryPolicy policy,
            RetryCallback onRetry) {
        
        RetryContext context = new RetryContext(operationName);
        
        while (true) {
            try {
                if (context.getAttemptNumber() > 0) {
                    Duration delay = policy.calculateDelay(context.getAttemptNumber());
                    
                    if (onRetry != null) {
                        onRetry.onRetry(context.getAttemptNumber(), delay, context.getLastException());
                    }
                    
                    Thread.sleep(delay.toMillis());
                }

                return operation.execute();
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Operation interrupted", e);
                
            } catch (Exception e) {
                context.recordAttempt(e);
                
                if (!context.shouldRetry(policy)) {
                    throw new RuntimeException(
                        String.format("Operation failed after %d attempts", 
                            context.getAttemptNumber()), 
                        e
                    );
                }
            }
        }
    }

    @FunctionalInterface
    public interface RetryCallback {
        void onRetry(int attemptNumber, Duration delay, Throwable lastException);
    }
}

