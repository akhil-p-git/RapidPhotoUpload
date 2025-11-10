package com.rapidphoto.infrastructure.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class UploadProgressWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(UploadProgressWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<UUID, String> userSessionMap = new ConcurrentHashMap<>();

    public UploadProgressWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        
        // Extract userId from query params if available
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query != null && query.contains("userId=")) {
            String userId = query.split("userId=")[1].split("&")[0];
            try {
                userSessionMap.put(UUID.fromString(userId), sessionId);
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid userId in WebSocket connection: {}", userId);
            }
        }
        
        logger.info("WebSocket connection established: sessionId={}", sessionId);
        
        // Send connection confirmation
        UploadProgressMessage welcome = new UploadProgressMessage();
        welcome.setStatus("CONNECTED");
        welcome.setMessage("WebSocket connection established");
        sendMessage(session, welcome);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        
        // Remove from user map
        userSessionMap.entrySet().removeIf(entry -> entry.getValue().equals(sessionId));
        
        logger.info("WebSocket connection closed: sessionId={}, status={}", sessionId, status);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Handle incoming messages (e.g., ping/pong for keep-alive)
        logger.debug("Received message from client: {}", message.getPayload());
    }

    public void broadcastProgress(UploadProgressMessage message) {
        UUID userId = message.getUserId();
        String sessionId = userSessionMap.get(userId);
        
        if (sessionId != null) {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            }
        } else {
            // Broadcast to all sessions (fallback)
            sessions.values().forEach(session -> {
                if (session.isOpen()) {
                    sendMessage(session, message);
                }
            });
        }
    }

    private void sendMessage(WebSocketSession session, UploadProgressMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
            logger.debug("Sent progress update to session: {}, photoId={}", 
                session.getId(), message.getPhotoId());
        } catch (IOException e) {
            logger.error("Failed to send message to session: {}", session.getId(), e);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket transport error: sessionId={}", session.getId(), exception);
    }
}

