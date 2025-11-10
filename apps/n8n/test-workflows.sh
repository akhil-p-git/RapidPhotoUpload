#!/bin/bash

# Test script for n8n workflows
# Usage: ./test-workflows.sh [workflow-number]

N8N_URL="http://localhost:5678"
TEST_PHOTO_ID="550e8400-e29b-41d4-a716-446655440000"
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing n8n Workflows${NC}"
echo "================================"

# Test Workflow 1: Photo Processing Pipeline
test_workflow_1() {
    echo -e "\n${YELLOW}Testing Workflow 1: Photo Processing Pipeline${NC}"
    
    PAYLOAD=$(cat <<EOF
{
  "photoId": "${TEST_PHOTO_ID}",
  "userId": "${TEST_USER_ID}",
  "fileName": "test-photo.jpg",
  "fileSizeBytes": 2048000,
  "storageLocation": "http://minio:9000/rapidphotoupload-media/test-photo.jpg"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST "${N8N_URL}/webhook/photo-uploaded" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Workflow 1 triggered successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Workflow 1 failed${NC}"
    fi
}

# Test Workflow 2: AI Tagging
test_workflow_2() {
    echo -e "\n${YELLOW}Testing Workflow 2: AI Tagging & Classification${NC}"
    
    PAYLOAD=$(cat <<EOF
{
  "photoId": "${TEST_PHOTO_ID}",
  "userId": "${TEST_USER_ID}",
  "storageLocation": "http://minio:9000/rapidphotoupload-media/test-photo.jpg"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST "${N8N_URL}/webhook/ai-tagging" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Workflow 2 triggered successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Workflow 2 failed${NC}"
    fi
}

# Test Workflow 3: Duplicate Detection
test_workflow_3() {
    echo -e "\n${YELLOW}Testing Workflow 3: Duplicate Detection${NC}"
    
    PAYLOAD=$(cat <<EOF
{
  "photoId": "${TEST_PHOTO_ID}",
  "userId": "${TEST_USER_ID}"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST "${N8N_URL}/webhook/duplicate-detection" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Workflow 3 triggered successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Workflow 3 failed${NC}"
    fi
}

# Test Workflow 4: Smart Organization
test_workflow_4() {
    echo -e "\n${YELLOW}Testing Workflow 4: Smart Organization & Clustering${NC}"
    
    PAYLOAD=$(cat <<EOF
{
  "photoId": "${TEST_PHOTO_ID}",
  "userId": "${TEST_USER_ID}"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST "${N8N_URL}/webhook/smart-organization" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Workflow 4 triggered successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Workflow 4 failed${NC}"
    fi
}

# Test Workflow 5: Storage Tiering
test_workflow_5() {
    echo -e "\n${YELLOW}Testing Workflow 5: Storage Tiering & Optimization${NC}"
    
    PAYLOAD=$(cat <<EOF
{
  "photoId": "${TEST_PHOTO_ID}",
  "userId": "${TEST_USER_ID}"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST "${N8N_URL}/webhook/storage-tiering" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Workflow 5 triggered successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}✗ Workflow 5 failed${NC}"
    fi
}

# Test all workflows
test_all() {
    test_workflow_1
    sleep 2
    test_workflow_2
    sleep 2
    test_workflow_3
    sleep 2
    test_workflow_4
    sleep 2
    test_workflow_5
}

# Check if n8n is running
check_n8n() {
    if ! curl -s "${N8N_URL}/healthz" > /dev/null; then
        echo -e "${RED}✗ n8n is not running at ${N8N_URL}${NC}"
        echo "Please start n8n with: docker-compose up -d"
        exit 1
    fi
    echo -e "${GREEN}✓ n8n is running${NC}"
}

# Main
check_n8n

if [ -z "$1" ]; then
    test_all
else
    case "$1" in
        1) test_workflow_1 ;;
        2) test_workflow_2 ;;
        3) test_workflow_3 ;;
        4) test_workflow_4 ;;
        5) test_workflow_5 ;;
        *) echo "Usage: $0 [workflow-number]"
           echo "  workflow-number: 1-5 (or omit to test all)"
           exit 1
           ;;
    esac
fi

echo -e "\n${GREEN}Testing complete!${NC}"
echo "Check n8n UI at ${N8N_URL} for execution results"

