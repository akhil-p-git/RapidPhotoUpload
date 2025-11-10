package com.rapidphoto.infrastructure.retry;

import java.time.LocalDateTime;

public class RetryContext {
    private final String operationId;
    private int attemptNumber;
    private LocalDateTime lastAttemptTime;
    private Throwable lastException;

    public RetryContext(String operationId) {
        this.operationId = operationId;
        this.attemptNumber = 0;
    }

    public void recordAttempt(Throwable exception) {
        this.attemptNumber++;
        this.lastAttemptTime = LocalDateTime.now();
        this.lastException = exception;
    }

    public boolean shouldRetry(RetryPolicy policy) {
        return attemptNumber < policy.getMaxAttempts();
    }

    // Getters
    public String getOperationId() { return operationId; }
    public int getAttemptNumber() { return attemptNumber; }
    public LocalDateTime getLastAttemptTime() { return lastAttemptTime; }
    public Throwable getLastException() { return lastException; }
}

