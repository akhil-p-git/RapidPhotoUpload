package com.rapidphoto.infrastructure.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final UploadProgressWebSocketHandler uploadProgressHandler;

    public WebSocketConfig(UploadProgressWebSocketHandler uploadProgressHandler) {
        this.uploadProgressHandler = uploadProgressHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(uploadProgressHandler, "/ws/upload-progress")
                .setAllowedOrigins("*"); // Configure properly for production
    }
}

