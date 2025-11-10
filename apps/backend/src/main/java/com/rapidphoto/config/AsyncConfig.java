package com.rapidphoto.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AsyncConfig implements AsyncConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);

    @Value("${upload.thread-pool.core-size:20}")
    private int corePoolSize;

    @Value("${upload.thread-pool.max-size:100}")
    private int maxPoolSize;

    @Value("${upload.thread-pool.queue-capacity:500}")
    private int queueCapacity;

    @Bean(name = "taskExecutor")
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Core pool size - minimum threads always alive
        executor.setCorePoolSize(corePoolSize);
        
        // Max pool size - maximum threads that can be created
        executor.setMaxPoolSize(maxPoolSize);
        
        // Queue capacity - tasks waiting for available thread
        executor.setQueueCapacity(queueCapacity);
        
        // Thread name prefix for debugging
        executor.setThreadNamePrefix("Upload-Async-");
        
        // Rejection policy - caller runs the task if queue is full
        executor.setRejectedExecutionHandler(
            (runnable, executor1) -> {
                logger.warn("Task rejected - thread pool and queue at capacity. Running in caller thread.");
                runnable.run();
            }
        );
        
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        
        executor.initialize();
        
        logger.info("Async task executor configured: core={}, max={}, queue={}", 
            corePoolSize, maxPoolSize, queueCapacity);
        
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) -> {
            logger.error("Async execution error in method: {} with params: {}", 
                method.getName(), params, throwable);
        };
    }
}

