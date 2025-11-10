#!/bin/bash

# Test n8n webhook for photo upload
# Make sure the workflow is activated in n8n UI first!

echo "Testing n8n webhook: photo-uploaded"
echo "=================================="

curl -X POST http://localhost:5678/webhook/photo-uploaded \
  -H "Content-Type: application/json" \
  -d '{
    "photoId": "test-photo-123",
    "userId": "user-456",
    "storagePath": "uploads/test-image.jpg",
    "fileSize": 2048000,
    "mimeType": "image/jpeg"
  }' | jq .

echo ""
echo "✅ If you see a JSON response above, the webhook is working!"
