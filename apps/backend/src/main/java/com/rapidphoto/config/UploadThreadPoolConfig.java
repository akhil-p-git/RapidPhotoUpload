package com.rapidphoto.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class UploadThreadPoolConfig {

    private static final Logger logger = LoggerFactory.getLogger(UploadThreadPoolConfig.class);

    @Value("${upload.thread-pool.core-size:20}")
    private int corePoolSize;

    @Value("${upload.thread-pool.max-size:100}")
    private int maxPoolSize;

    @Value("${upload.thread-pool.queue-capacity:500}")
    private int queueCapacity;

    /**
     * Thread pool specifically for file upload processing
     */
    @Bean(name = "uploadExecutor")
    public Executor uploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("Upload-Worker-");
        
        // CallerRunsPolicy - if pool is full, caller thread executes the task
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(120); // Wait up to 2 minutes for uploads to finish
        
        executor.initialize();
        
        logger.info("Upload executor configured: core={}, max={}, queue={}", 
            corePoolSize, maxPoolSize, queueCapacity);
        
        return executor;
    }

    /**
     * Thread pool for webhook notifications to n8n
     */
    @Bean(name = "webhookExecutor")
    public Executor webhookExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Smaller pool for webhooks (not CPU intensive)
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("Webhook-Worker-");
        
        // AbortPolicy - throw exception if queue is full (webhooks can be retried)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        executor.initialize();
        
        logger.info("Webhook executor configured: core=5, max=20, queue=100");
        
        return executor;
    }

    /**
     * Thread pool for image processing tasks
     */
    @Bean(name = "processingExecutor")
    public Executor processingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // CPU-intensive tasks - use available processors
        int processors = Runtime.getRuntime().availableProcessors();
        executor.setCorePoolSize(processors);
        executor.setMaxPoolSize(processors * 2);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("Processing-Worker-");
        
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(180); // Wait up to 3 minutes for processing
        
        executor.initialize();
        
        logger.info("Processing executor configured: core={}, max={}, queue=200", 
            processors, processors * 2);
        
        return executor;
    }
}

