package com.rapidphoto.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executor;

@Configuration
public class ThreadPoolMetricsConfig {

    @Bean
    public HealthIndicator uploadExecutorHealthIndicator(
            @Qualifier("uploadExecutor") Executor executor) {
        
        return () -> {
            if (executor instanceof ThreadPoolTaskExecutor) {
                ThreadPoolTaskExecutor taskExecutor = (ThreadPoolTaskExecutor) executor;
                
                Map<String, Object> details = new HashMap<>();
                details.put("activeThreads", taskExecutor.getActiveCount());
                details.put("poolSize", taskExecutor.getPoolSize());
                details.put("corePoolSize", taskExecutor.getCorePoolSize());
                details.put("maxPoolSize", taskExecutor.getMaxPoolSize());
                details.put("queueSize", taskExecutor.getThreadPoolExecutor().getQueue().size());
                details.put("queueCapacity", taskExecutor.getQueueCapacity());
                details.put("completedTasks", taskExecutor.getThreadPoolExecutor().getCompletedTaskCount());
                
                // Health check - warn if queue is > 80% full
                int queueSize = taskExecutor.getThreadPoolExecutor().getQueue().size();
                int queueCapacity = taskExecutor.getQueueCapacity();
                double queueUtilization = (double) queueSize / queueCapacity;
                
                if (queueUtilization > 0.8) {
                    return Health.down()
                        .withDetails(details)
                        .withDetail("warning", "Queue utilization above 80%")
                        .build();
                }
                
                return Health.up().withDetails(details).build();
            }
            
            return Health.unknown().build();
        };
    }
}

