# Environment Variables Configuration

This document describes all environment variables needed for the n8n workflows.

## Required Environment Variables

### Database Configuration

```bash
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=rapidphotoupload
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### AI Services (Choose One or More)

#### Google Cloud Vision API
```bash
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here
```

**Getting a Google Vision API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Cloud Vision API
4. Create credentials (API Key)
5. Copy the API key

#### AWS Rekognition
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

**Getting AWS Credentials:**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user with Rekognition permissions
3. Generate access keys
4. Copy the access key ID and secret

#### Azure Computer Vision
```bash
AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_COMPUTER_VISION_KEY=your_azure_key
```

**Getting Azure Credentials:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a Computer Vision resource
3. Copy the endpoint and key from the resource

### Storage Configuration

#### AWS S3 (or MinIO for local development)
```bash
AWS_S3_BUCKET=rapidphotoupload-media
AWS_S3_ENDPOINT=http://minio:9000  # For MinIO, leave empty for AWS S3
AWS_REGION=us-east-1
```

#### Local Storage
```bash
LOCAL_STORAGE_PATH=/app/storage
```

### Backend Webhook

```bash
BACKEND_WEBHOOK_URL=http://host.docker.internal:8080/api/webhooks/processing-complete
```

## Setting Environment Variables

### Option 1: docker-compose.yml (Recommended for Development)

Add to `docker-compose.yml` under `n8n` service `environment` section:

```yaml
environment:
  - GOOGLE_VISION_API_KEY=your_key_here
  - AWS_ACCESS_KEY_ID=your_key
  - AWS_SECRET_ACCESS_KEY=your_secret
  # ... etc
```

### Option 2: .env File (Recommended for Production)

Create a `.env` file in the `apps/n8n` directory:

```bash
# .env file
GOOGLE_VISION_API_KEY=your_key_here
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
POSTGRES_PASSWORD=strong_password_here
# ... etc
```

Then reference in `docker-compose.yml`:

```yaml
environment:
  - GOOGLE_VISION_API_KEY=${GOOGLE_VISION_API_KEY}
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  # ... etc
```

### Option 3: n8n UI (For Quick Testing)

1. Open n8n UI: http://localhost:5678
2. Go to Settings → Environment Variables
3. Add variables there

## Security Best Practices

### DO ✅
- Use environment variables for all secrets
- Use `.env` file (and add to `.gitignore`)
- Rotate credentials regularly
- Use separate credentials per environment
- Use least-privilege IAM roles for AWS/Azure
- Enable API key restrictions in Google Cloud

### DON'T ❌
- Hardcode API keys in workflow JSON files
- Commit `.env` files to git
- Use production credentials in development
- Share credentials between team members
- Use default passwords

## Testing Environment Variables

Test if environment variables are set correctly:

```bash
# Check n8n container environment
docker exec rapidphoto-n8n env | grep GOOGLE_VISION_API_KEY

# Test from within workflow
# Use Code node:
console.log(process.env.GOOGLE_VISION_API_KEY);
```

## Production Deployment

For production, use:
- Kubernetes Secrets
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

Example with Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: n8n-secrets
type: Opaque
stringData:
  GOOGLE_VISION_API_KEY: your_key_here
  AWS_SECRET_ACCESS_KEY: your_secret
```

Then reference in deployment:

```yaml
env:
  - name: GOOGLE_VISION_API_KEY
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: GOOGLE_VISION_API_KEY
```

