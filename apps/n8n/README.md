# n8n Workflows for RapidPhotoUpload

This directory contains all n8n workflow automation configurations for the RapidPhotoUpload platform.

## 🚀 Quick Start

### Start n8n and all services

```bash
cd apps/n8n
docker-compose up -d
```

### Access Services

- **n8n UI**: http://localhost:5678 (admin / rapidphoto123)
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **PostgreSQL**: localhost:5432 (postgres / postgres)
- **Redis**: localhost:6379
- **pgAdmin** (optional): http://localhost:5050 (admin@rapidphoto.local / admin123)
  - Start with: `docker-compose --profile tools up`

### First-Time Setup

1. **Start Services**
   ```bash
   docker-compose up -d
   ```

2. **Access n8n**
   - Open http://localhost:5678
   - Login with: admin / rapidphoto123

3. **Configure MinIO (S3-compatible storage)**
   - Open http://localhost:9001
   - Login: minioadmin / minioadmin123
   - Create bucket: `rapidphotoupload-media`
   - Make bucket public (for development only)

4. **Import Workflows**
   - In n8n UI: Workflows → Import from File
   - Import all JSON files from `./workflows/` directory

5. **Configure Credentials**
   - Add AWS S3 credentials (use MinIO for local dev)
   - Add PostgreSQL credentials
   - Add SMTP credentials (for email notifications)

## 📋 Available Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Photo Processing Pipeline | `photo-processing-pipeline.json` | Webhook: `/webhook/photo-uploaded` | Orchestrates image processing |
| AI Tagging & Analysis | `ai-tagging-workflow.json` | Webhook: `/webhook/analyze-photo` | Runs ML models for tagging |
| Duplicate Detection | `duplicate-detection.json` | Webhook: `/webhook/check-duplicate` | Perceptual hash comparison |
| Thumbnail Generator | `thumbnail-generator.json` | Webhook: `/webhook/generate-thumbnail` | Creates thumbnails |
| Storage Tiering | `storage-tiering.json` | Schedule: Daily 2 AM | Moves old files to cold storage |
| Upload Notifications | `upload-notifications.json` | Webhook: `/webhook/notify-upload` | Sends email/push notifications |
| Error Handler | `error-handler.json` | Webhook: `/webhook/error` | Handles failures and alerts |

## 🔧 n8n Integration Pattern

### Backend → n8n Flow

```java
// Spring Boot backend triggers n8n workflow
@Service
public class UploadEventPublisher {

    @Value("${n8n.webhook.url}")
    private String n8nWebhookUrl;

    @EventListener
    public void handlePhotoUploaded(PhotoUploadedEvent event) {
        PhotoWebhookPayload payload = PhotoWebhookPayload.builder()
            .photoId(event.getPhotoId())
            .userId(event.getUserId())
            .storagePath(event.getStoragePath())
            .fileSize(event.getFileSize())
            .mimeType(event.getMimeType())
            .build();

        // Trigger n8n workflow asynchronously
        restTemplate.postForEntity(
            n8nWebhookUrl + "/photo-uploaded",
            payload,
            String.class
        );
    }
}
```

### n8n → Backend Flow

```typescript
// n8n HTTP Request node calling backend
{
  method: 'POST',
  url: '{{$env.BACKEND_API_URL}}/api/photos/{{$json.photoId}}/metadata',
  authentication: 'genericCredentialType',
  headers: {
    'Authorization': 'Bearer {{$env.BACKEND_JWT_SECRET}}'
  },
  body: {
    aiTags: '{{$json.tags}}',
    quality: '{{$json.quality}}',
    processedAt: '{{$now}}'
  }
}
```

## 📝 Creating a New Workflow

1. **Design in n8n UI**
   - Open http://localhost:5678
   - Create new workflow
   - Add trigger (Webhook, Schedule, etc.)
   - Add processing nodes
   - Test with Execute Workflow button

2. **Test with Real Data**
   ```bash
   # Trigger webhook manually
   curl -X POST http://localhost:5678/webhook/photo-uploaded \
     -H "Content-Type: application/json" \
     -d '{
       "photoId": "test-123",
       "userId": "user-456",
       "storagePath": "uploads/test.jpg",
       "fileSize": 1024000,
       "mimeType": "image/jpeg"
     }'
   ```

3. **Export Workflow**
   - In n8n: Settings → Export Workflow
   - Save to `./workflows/your-workflow-name.json`

4. **Document Workflow**
   - Add description to workflow JSON
   - Update this README
   - Create diagram in `docs/workflows/`

5. **Version Control**
   ```bash
   git add workflows/your-workflow-name.json
   git commit -m "Add workflow: your-workflow-name"
   ```

## 🔒 Security Best Practices

### DO ✅

- Use environment variables for secrets
- Enable webhook authentication in production
- Use HTTPS in production (not http)
- Rotate credentials regularly
- Use separate credentials per environment
- Enable execution logs for debugging
- Set up error notifications

### DON'T ❌

- Hardcode API keys or passwords
- Commit `.env` files to git
- Use default passwords in production
- Skip error handling nodes
- Create circular dependencies
- Expose webhooks publicly without auth

## 🔍 Debugging Workflows

### View Execution Logs

```bash
# View n8n logs
docker logs rapidphoto-n8n -f

# View all services
docker-compose logs -f
```

### Test Workflow in n8n UI

1. Open workflow in n8n
2. Click "Execute Workflow"
3. Check execution results
4. Inspect node outputs

### Manual Webhook Testing

```bash
# Test photo upload webhook
curl -X POST http://localhost:5678/webhook/photo-uploaded \
  -H "Content-Type: application/json" \
  -d @test-data/photo-uploaded-payload.json

# Test with auth (production)
curl -X POST https://n8n.yourapp.com/webhook/photo-uploaded \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-token" \
  -d @test-data/photo-uploaded-payload.json
```

## 🚀 Production Deployment

### Environment Variables

Update `.env` for production:

```bash
# n8n Configuration
N8N_PROTOCOL=https
N8N_HOST=n8n.yourdomain.com
N8N_BASIC_AUTH_ACTIVE=false  # Use OAuth instead

# Use real database
DB_POSTGRESDB_HOST=your-rds-endpoint.amazonaws.com
DB_POSTGRESDB_PASSWORD=strong-password-here

# Real AWS S3
AWS_S3_ENDPOINT=  # Leave empty for AWS S3
AWS_S3_BUCKET=production-bucket

# Security
N8N_ENCRYPTION_KEY=use-secure-random-key-generator
```

### Kubernetes Deployment

See `infrastructure/k8s/n8n/` for Kubernetes manifests.

```bash
kubectl apply -f infrastructure/k8s/n8n/
```

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Forum](https://community.n8n.io/)
- [n8n Workflow Templates](https://n8n.io/workflows/)
- [n8n API Reference](https://docs.n8n.io/api/)

## 🆘 Troubleshooting

### n8n won't start

```bash
# Check logs
docker logs rapidphoto-n8n

# Common issues:
# 1. Port 5678 already in use
docker-compose down
lsof -ti:5678 | xargs kill -9

# 2. Database connection failed
docker-compose restart postgres
```

### Webhook not receiving data

1. Check n8n execution logs
2. Verify webhook URL is correct
3. Test with curl
4. Check network connectivity (Docker network)
5. Verify webhook is activated in n8n UI

### Workflow execution fails

1. Check node configuration
2. Verify credentials
3. Test individual nodes
4. Check error logs in n8n UI
5. Enable "Always Output Data" for debugging

## 📞 Support

For issues specific to n8n integration, check:
- n8n logs: `docker logs rapidphoto-n8n`
- PostgreSQL logs: `docker logs rapidphoto-postgres`
- Application logs in `apps/backend/logs/`
