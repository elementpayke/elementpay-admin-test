#!/bin/bash

# ElementPay Sandbox Development Docker Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ElementPay Sandbox Development Environment${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cat > .env << EOF
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-development-secret-change-this

# ElementPay API Configuration
NEXT_PRIVATE_ELEMENTPAY_SANDBOX_BASE=https://sandbox.elementpay.net/api/v1
NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE=https://api.elementpay.net/api/v1
NEXT_PRIVATE_ELEMENTPAY_ENV=sandbox
EOF
    echo -e "${GREEN}✅ Created .env file. Please update it with your actual values.${NC}"
    echo ""
fi

# Function to start development environment
start_dev() {
    echo -e "${YELLOW}🏗️  Building development image...${NC}"
    docker-compose -f docker-compose.dev.yml build
    
    echo -e "${YELLOW}🚀 Starting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml up
}

# Function to stop development environment
stop_dev() {
    echo -e "${YELLOW}🛑 Stopping development environment...${NC}"
    docker-compose -f docker-compose.dev.yml down
}

# Function to restart development environment
restart_dev() {
    echo -e "${YELLOW}🔄 Restarting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up --build
}

# Function to view logs
logs_dev() {
    echo -e "${YELLOW}📋 Viewing development logs...${NC}"
    docker-compose -f docker-compose.dev.yml logs -f
}

# Function to clean up
clean_dev() {
    echo -e "${YELLOW}🧹 Cleaning up development environment...${NC}"
    docker-compose -f docker-compose.dev.yml down --rmi all --volumes
    docker system prune -f
}

# Parse command line arguments
case "${1:-start}" in
    "start")
        start_dev
        ;;
    "stop")
        stop_dev
        ;;
    "restart")
        restart_dev
        ;;
    "logs")
        logs_dev
        ;;
    "clean")
        clean_dev
        ;;
    "help"|"-h"|"--help")
        echo -e "${BLUE}ElementPay Sandbox Development Script${NC}"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    Start the development environment (default)"
        echo "  stop     Stop the development environment"
        echo "  restart  Restart the development environment"
        echo "  logs     View development logs"
        echo "  clean    Clean up containers and images"
        echo "  help     Show this help message"
        echo ""
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
