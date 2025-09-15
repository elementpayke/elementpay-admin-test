#!/bin/bash

# ElementPay Sandbox Docker Build Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="elementpay-sandbox"
IMAGE_TAG="${1:-latest}"
FULL_IMAGE_NAME="$IMAGE_NAME:$IMAGE_TAG"

echo -e "${BLUE}🐳 Building ElementPay Sandbox Docker Image${NC}"
echo -e "${YELLOW}Image: $FULL_IMAGE_NAME${NC}"
echo ""

# Build the Docker image
echo -e "${YELLOW}📦 Building production image...${NC}"
docker build -t "$FULL_IMAGE_NAME" .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    
    # Show image info
    echo -e "${BLUE}📊 Image Information:${NC}"
    docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    
    # Optional: Run a quick test
    read -p "🚀 Would you like to run a quick test? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🧪 Running quick test...${NC}"
        docker run --rm -p 3001:3000 -e AUTH_SECRET=test-secret "$FULL_IMAGE_NAME" &
        CONTAINER_PID=$!
        
        # Wait a moment for the container to start
        sleep 5
        
        # Test health endpoint
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed!${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
        fi
        
        # Stop the test container
        kill $CONTAINER_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo -e "${BLUE}To run the container:${NC}"
    echo "docker run -p 3000:3000 -e AUTH_SECRET=your-secret $FULL_IMAGE_NAME"
    echo ""
    echo -e "${BLUE}Or use docker-compose:${NC}"
    echo "docker-compose up"
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
