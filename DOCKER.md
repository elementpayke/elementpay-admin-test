# 🐳 ElementPay Sandbox - Docker Guide

This guide will help you dockerize and run the ElementPay Sandbox application using Docker and Docker Compose.

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0 or higher)
- Git

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-super-secret-auth-key-change-this-in-production

# ElementPay API Configuration
NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE=https://sandbox.elementpay.net/api/v1
NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE=https://api.elementpay.net/api/v1
NEXT_PUBLIC_ELEMENTPAY_ENV=sandbox
```

### 2. Production Deployment

```bash
# Build and run the production container
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`

### 3. Development Environment

```bash
# Start development environment with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

## 📁 Docker Files Overview

### Core Docker Files

- **`Dockerfile`** - Multi-stage production build
- **`Dockerfile.dev`** - Development environment with hot reloading
- **`docker-compose.yml`** - Production orchestration
- **`docker-compose.dev.yml`** - Development orchestration
- **`.dockerignore`** - Files to exclude from Docker context

### Helper Scripts (Linux/macOS)

- **`scripts/docker-build.sh`** - Production build script
- **`scripts/docker-dev.sh`** - Development environment manager

## 🛠️ Available Commands

### Production Commands

```bash
# Build the production image
docker build -t elementpay-sandbox .

# Run production container
docker run -p 3000:3000 --env-file .env elementpay-sandbox

# Using Docker Compose (recommended)
docker-compose up --build
docker-compose down

# View logs
docker-compose logs -f
```

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# View development logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild development image
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Utility Commands

```bash
# Health check
curl http://localhost:3000/api/health

# View container status
docker ps

# Clean up unused resources
docker system prune -f

# Remove all ElementPay containers and images
docker-compose down --rmi all --volumes
```

## 🏗️ Build Process

The production Dockerfile uses a multi-stage build:

1. **Dependencies Stage** - Installs npm/pnpm dependencies
2. **Builder Stage** - Builds the Next.js application
3. **Runner Stage** - Creates minimal runtime image

### Build Optimizations

- Uses Node.js 18 Alpine for smaller image size
- Leverages Next.js standalone output for minimal runtime
- Implements proper layer caching for faster rebuilds
- Runs as non-root user for security

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXTAUTH_URL` | NextAuth base URL | `http://localhost:3000` |
| `AUTH_SECRET` | NextAuth secret key | Required |
| `NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE` | Sandbox API URL | `https://sandbox.elementpay.net/api/v1` |
| `NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE` | Live API URL | `https://api.elementpay.net/api/v1` |
| `NEXT_PUBLIC_ELEMENTPAY_ENV` | Default environment | `sandbox` |

### Port Configuration

- **Application**: `3000`
- **Health Check**: `http://localhost:3000/api/health`

## 🚨 Troubleshooting

### Common Issues

#### 1. Permission Errors (Linux/macOS)
```bash
sudo chown -R $USER:$USER .
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use different port
docker-compose up -p 3001:3000
```

#### 3. Build Failures
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### 4. Container Won't Start
```bash
# Check logs
docker-compose logs

# Check health
curl http://localhost:3000/api/health
```

### Performance Optimization

#### 1. Enable BuildKit (Faster Builds)
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

#### 2. Resource Limits
```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## 🔒 Security Considerations

### Production Security

1. **Use Strong Secrets**
   ```bash
   # Generate secure AUTH_SECRET
   openssl rand -base64 32
   ```

2. **Non-Root User**
   - Container runs as `nextjs` user (UID 1001)

3. **Minimal Base Image**
   - Uses Alpine Linux for smaller attack surface

4. **Environment Variables**
   - Never commit `.env` files to version control
   - Use Docker secrets in production

### Network Security

```yaml
# Optional: Custom network configuration
networks:
  elementpay-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 📊 Monitoring

### Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "elementpay_sandbox": "configured",
    "elementpay_live": "configured",
    "auth": "configured"
  }
}
```

### Docker Health Check

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View health check logs
docker inspect --format='{{json .State.Health}}' container_name
```

## 🚀 Deployment Options

### 1. Local Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### 2. Staging/Production
```bash
docker-compose up -d
```

### 3. Cloud Deployment

#### AWS ECS
```bash
# Build for ARM64 (Graviton)
docker buildx build --platform linux/arm64 -t elementpay-sandbox .
```

#### Google Cloud Run
```bash
# Build and push to GCR
docker build -t gcr.io/PROJECT_ID/elementpay-sandbox .
docker push gcr.io/PROJECT_ID/elementpay-sandbox
```

#### Azure Container Instances
```bash
# Build and push to ACR
docker build -t elementpay.azurecr.io/sandbox .
docker push elementpay.azurecr.io/sandbox
```

## 📝 Best Practices

1. **Use .dockerignore** - Exclude unnecessary files
2. **Multi-stage builds** - Keep production images small
3. **Layer caching** - Order Dockerfile commands by change frequency
4. **Health checks** - Implement proper health endpoints
5. **Security scanning** - Use `docker scan` or similar tools
6. **Resource limits** - Set appropriate memory/CPU limits
7. **Logging** - Use structured logging for better monitoring

## 🤝 Contributing

When contributing Docker-related changes:

1. Test both development and production builds
2. Update this documentation for any new features
3. Ensure security best practices are followed
4. Test on different platforms (Linux, macOS, Windows)

## 📞 Support

For Docker-related issues:

1. Check the troubleshooting section above
2. Review Docker and Docker Compose logs
3. Verify environment variable configuration
4. Test the health endpoint

---

**Happy Dockerizing! 🐳✨**
