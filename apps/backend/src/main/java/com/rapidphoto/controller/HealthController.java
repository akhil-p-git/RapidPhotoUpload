package com.rapidphoto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Value("${n8n.base-url}")
    private String n8nBaseUrl;

    @Value("${n8n.webhook.photo-uploaded}")
    private String photoUploadedWebhook;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("service", "RapidPhotoUpload Backend");

        // Test database connection
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            response.put("database", "connected");
        } catch (Exception e) {
            response.put("database", "disconnected: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/test-n8n")
    public ResponseEntity<Map<String, Object>> testN8nWebhook() {
        Map<String, Object> response = new HashMap<>();

        try {
            RestTemplate restTemplate = new RestTemplate();

            // Prepare test payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("photoId", "test-" + System.currentTimeMillis());
            payload.put("userId", "test-user-123");
            payload.put("fileName", "test-photo.jpg");
            payload.put("fileSize", 1024000);
            payload.put("timestamp", LocalDateTime.now().toString());

            // Send to n8n webhook
            String webhookUrl = n8nBaseUrl + photoUploadedWebhook;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> n8nResponse = restTemplate.postForEntity(
                webhookUrl,
                request,
                String.class
            );

            response.put("status", "success");
            response.put("n8n_status", n8nResponse.getStatusCode().toString());
            response.put("n8n_response", n8nResponse.getBody());
            response.put("webhook_url", webhookUrl);

        } catch (Exception e) {
            response.put("status", "failed");
            response.put("error", e.getMessage());
        }

        return ResponseEntity.ok(response);
    }
}

