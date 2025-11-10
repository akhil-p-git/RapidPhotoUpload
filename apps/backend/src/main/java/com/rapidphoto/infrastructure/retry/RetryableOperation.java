package com.rapidphoto.infrastructure.retry;

@FunctionalInterface
public interface RetryableOperation<T> {
    T execute() throws Exception;
}

