# Docker Deployment Strategy - Production Container Architecture

## 1. Docker Architecture Overview

### Multi-Container Structure
```yaml
pingtopass/
├── docker-compose.yml           # Development environment
├── docker-compose.prod.yml      # Production overrides
├── docker-compose.test.yml      # Testing environment
├── .env.example                 # Environment template
├── dockerfiles/
│   ├── api.Dockerfile          # FastAPI application
│   ├── nginx.Dockerfile        # Nginx reverse proxy
│   └── worker.Dockerfile       # Background worker
├── config/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   ├── mongodb/
│   │   ├── mongod.conf
│   │   └── init-scripts/
│   └── redis/
│       └── redis.conf
└── scripts/
    ├── deploy.sh
    ├── backup.sh
    └── health-check.sh
```

## 2. Docker Compose Configuration

### 2.1 Development Environment (docker-compose.yml)
```yaml
version: '3.9'

services:
  # FastAPI Application
  api:
    build:
      context: .
      dockerfile: dockerfiles/api.Dockerfile
      target: development
    container_name: pingtopass-api
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app
      - ./static:/static
    environment:
      - ENV=development
      - MONGODB_URL=mongodb://mongodb:27017/pingtopass_dev
      - REDIS_URL=redis://redis:6379/0
      - RELOAD=true
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pingtopass-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: pingtopass-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
      - ./config/mongodb/mongod.conf:/etc/mongod.conf
      - ./config/mongodb/init-scripts:/docker-entrypoint-initdb.d
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=pingtopass_dev
    networks:
      - pingtopass-network
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s
    command: ["mongod", "--config", "/etc/mongod.conf"]

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: pingtopass-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./config/redis/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - pingtopass-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]

  # Background Worker
  worker:
    build:
      context: .
      dockerfile: dockerfiles/worker.Dockerfile
    container_name: pingtopass-worker
    volumes:
      - ./app:/app
    environment:
      - ENV=development
      - MONGODB_URL=mongodb://mongodb:27017/pingtopass_dev
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - mongodb
      - redis
      - api
    networks:
      - pingtopass-network
    restart: unless-stopped

  # Development Tools
  mongo-express:
    image: mongo-express:latest
    container_name: pingtopass-mongo-express
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_URL=mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/
      - ME_CONFIG_BASICAUTH_USERNAME=${ME_USERNAME}
      - ME_CONFIG_BASICAUTH_PASSWORD=${ME_PASSWORD}
    depends_on:
      - mongodb
    networks:
      - pingtopass-network
    profiles:
      - dev-tools

networks:
  pingtopass-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16

volumes:
  mongodb-data:
    driver: local
  redis-data:
    driver: local
```

### 2.2 Production Environment (docker-compose.prod.yml)
```yaml
version: '3.9'

services:
  # Nginx Reverse Proxy
  nginx:
    build:
      context: .
      dockerfile: dockerfiles/nginx.Dockerfile
    container_name: pingtopass-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./config/nginx/ssl:/etc/nginx/ssl
      - ./static:/usr/share/nginx/html/static
      - nginx-cache:/var/cache/nginx
    depends_on:
      - api
    networks:
      - pingtopass-network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # FastAPI Application (Production)
  api:
    build:
      target: production
    ports:
      - "8000"  # Only expose internally
    environment:
      - ENV=production
      - MONGODB_URL=mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/pingtopass?replicaSet=rs0
      - REDIS_URL=redis://redis-master:6379/0
      - WORKERS=4
      - RELOAD=false
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  # MongoDB Replica Set
  mongodb1:
    image: mongo:7.0
    container_name: pingtopass-mongodb1
    volumes:
      - mongodb1-data:/data/db
      - ./config/mongodb/mongod.conf:/etc/mongod.conf
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    networks:
      - pingtopass-network
    restart: always
    command: ["mongod", "--config", "/etc/mongod.conf", "--replSet", "rs0"]

  mongodb2:
    image: mongo:7.0
    container_name: pingtopass-mongodb2
    volumes:
      - mongodb2-data:/data/db
      - ./config/mongodb/mongod.conf:/etc/mongod.conf
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    networks:
      - pingtopass-network
    restart: always
    command: ["mongod", "--config", "/etc/mongod.conf", "--replSet", "rs0"]

  mongodb3:
    image: mongo:7.0
    container_name: pingtopass-mongodb3
    volumes:
      - mongodb3-data:/data/db
      - ./config/mongodb/mongod.conf:/etc/mongod.conf
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    networks:
      - pingtopass-network
    restart: always
    command: ["mongod", "--config", "/etc/mongod.conf", "--replSet", "rs0"]

  # Redis Master-Slave Setup
  redis-master:
    image: redis:7-alpine
    container_name: pingtopass-redis-master
    volumes:
      - redis-master-data:/data
      - ./config/redis/redis-master.conf:/usr/local/etc/redis/redis.conf
    networks:
      - pingtopass-network
    restart: always

  redis-slave:
    image: redis:7-alpine
    container_name: pingtopass-redis-slave
    volumes:
      - redis-slave-data:/data
      - ./config/redis/redis-slave.conf:/usr/local/etc/redis/redis.conf
    networks:
      - pingtopass-network
    restart: always
    command: ["redis-server", "/usr/local/etc/redis/redis.conf", "--slaveof", "redis-master", "6379"]

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: pingtopass-prometheus
    volumes:
      - ./config/prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - pingtopass-network
    restart: always

  grafana:
    image: grafana/grafana:latest
    container_name: pingtopass-grafana
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - pingtopass-network
    restart: always

volumes:
  mongodb1-data:
  mongodb2-data:
  mongodb3-data:
  redis-master-data:
  redis-slave-data:
  nginx-cache:
  prometheus-data:
  grafana-data:
```

## 3. Dockerfile Configurations

### 3.1 FastAPI Application (dockerfiles/api.Dockerfile)
```dockerfile
# Multi-stage build for optimization
FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development

# Install development dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    pytest-cov \
    black \
    flake8 \
    mypy

# Copy application code
COPY ./app /app

# Expose port
EXPOSE 8000

# Run with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser ./app /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Run with production settings
CMD ["gunicorn", "main:app", \
     "-w", "4", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50"]
```

### 3.2 Nginx Configuration (dockerfiles/nginx.Dockerfile)
```dockerfile
FROM nginx:alpine

# Install certbot for SSL
RUN apk add --no-cache certbot certbot-nginx

# Copy custom nginx configuration
COPY config/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates (if available)
COPY config/nginx/ssl /etc/nginx/ssl

# Create cache directory
RUN mkdir -p /var/cache/nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nginx -t && curl -f http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 Worker Configuration (dockerfiles/worker.Dockerfile)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app

# Run Celery worker
CMD ["celery", "-A", "app.workers", "worker", \
     "--loglevel=info", \
     "--concurrency=4", \
     "--max-tasks-per-child=100"]
```

## 4. Configuration Files

### 4.1 Nginx Configuration (config/nginx/nginx.conf)
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-js text/x-cross-domain-policy application/x-font-ttf 
               application/x-font-opentype application/vnd.ms-fontobject 
               image/x-icon;

    # Cache settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m 
                     max_size=1g inactive=60m use_temp_path=off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Upstream configuration
    upstream api_backend {
        least_conn;
        server api:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTPS redirect
    server {
        listen 80;
        server_name pingtopass.com www.pingtopass.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name pingtopass.com www.pingtopass.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling on;
        ssl_stapling_verify on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Static files
        location /static/ {
            alias /usr/share/nginx/html/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # API proxy
        location /api/ {
            # Rate limiting
            limit_req zone=api_limit burst=20 nodelay;
            
            # Proxy settings
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Cache configuration
            proxy_cache api_cache;
            proxy_cache_valid 200 5m;
            proxy_cache_valid 404 1m;
            proxy_cache_bypass $http_authorization;
            proxy_no_cache $http_authorization;
            
            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;
        }

        # WebSocket support
        location /ws/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        # Health check endpoint
        location /nginx-health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 4.2 MongoDB Configuration (config/mongodb/mongod.conf)
```yaml
# MongoDB configuration for production

storage:
  dbPath: /data/db
  journal:
    enabled: true
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 0.0.0.0
  maxIncomingConnections: 1000

security:
  authorization: enabled
  javascriptEnabled: true

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

replication:
  replSetName: rs0
  oplogSizeMB: 2048

setParameter:
  enableLocalhostAuthBypass: false
```

### 4.3 Redis Configuration (config/redis/redis.conf)
```conf
# Redis configuration for production

# Network
bind 0.0.0.0
protected-mode yes
port 6379
tcp-backlog 511
tcp-keepalive 300

# General
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# Replication
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5

# Limits
maxclients 10000
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Performance
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no
```

## 5. Deployment Scripts

### 5.1 Deployment Script (scripts/deploy.sh)
```bash
#!/bin/bash

# PingToPass Docker Deployment Script

set -e

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
PROD_OVERRIDE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting PingToPass deployment for ${ENVIRONMENT}...${NC}"

# Load environment variables
if [ -f .env.${ENVIRONMENT} ]; then
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.${ENVIRONMENT} file not found${NC}"
    exit 1
fi

# Pull latest images
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose -f ${COMPOSE_FILE} -f ${PROD_OVERRIDE} pull

# Build custom images
echo -e "${YELLOW}Building custom images...${NC}"
docker-compose -f ${COMPOSE_FILE} -f ${PROD_OVERRIDE} build --no-cache

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f ${COMPOSE_FILE} -f ${PROD_OVERRIDE} down

# Start new containers
echo -e "${YELLOW}Starting new containers...${NC}"
docker-compose -f ${COMPOSE_FILE} -f ${PROD_OVERRIDE} up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Run health checks
./scripts/health-check.sh

# Initialize MongoDB replica set (first time only)
if [ "$2" == "--init-replica" ]; then
    echo -e "${YELLOW}Initializing MongoDB replica set...${NC}"
    docker exec pingtopass-mongodb1 mongosh --eval "
        rs.initiate({
            _id: 'rs0',
            members: [
                { _id: 0, host: 'mongodb1:27017' },
                { _id: 1, host: 'mongodb2:27017' },
                { _id: 2, host: 'mongodb3:27017' }
            ]
        })
    "
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker exec pingtopass-api python -m app.migrations.run_migrations

# Clean up old images
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}Deployment completed successfully!${NC}"
```

### 5.2 Health Check Script (scripts/health-check.sh)
```bash
#!/bin/bash

# Health check script for PingToPass services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check API
echo -n "Checking API health... "
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$API_HEALTH" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED (HTTP $API_HEALTH)${NC}"
    exit 1
fi

# Check MongoDB
echo -n "Checking MongoDB health... "
MONGO_HEALTH=$(docker exec pingtopass-mongodb1 mongosh --quiet --eval "db.adminCommand('ping').ok")
if [ "$MONGO_HEALTH" == "1" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Check Redis
echo -n "Checking Redis health... "
REDIS_HEALTH=$(docker exec pingtopass-redis-master redis-cli ping)
if [ "$REDIS_HEALTH" == "PONG" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Check Nginx
echo -n "Checking Nginx health... "
NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/nginx-health)
if [ "$NGINX_HEALTH" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED (HTTP $NGINX_HEALTH)${NC}"
    exit 1
fi

echo -e "${GREEN}All services healthy!${NC}"
```

### 5.3 Backup Script (scripts/backup.sh)
```bash
#!/bin/bash

# Backup script for MongoDB data

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pingtopass_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Dump MongoDB
echo "Starting MongoDB backup..."
docker exec pingtopass-mongodb1 mongodump \
    --host rs0/mongodb1:27017,mongodb2:27017,mongodb3:27017 \
    --authenticationDatabase admin \
    --username ${MONGO_ROOT_USER} \
    --password ${MONGO_ROOT_PASSWORD} \
    --out /tmp/${BACKUP_NAME}

# Compress backup
docker exec pingtopass-mongodb1 tar -czf /tmp/${BACKUP_NAME}.tar.gz -C /tmp ${BACKUP_NAME}

# Copy to host
docker cp pingtopass-mongodb1:/tmp/${BACKUP_NAME}.tar.gz ${BACKUP_DIR}/

# Clean up container
docker exec pingtopass-mongodb1 rm -rf /tmp/${BACKUP_NAME}*

# Upload to S3 (optional)
# aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz s3://pingtopass-backups/

# Keep only last 7 days of backups
find ${BACKUP_DIR} -name "pingtopass_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_NAME}.tar.gz"
```

## 6. Environment Variables (.env.example)

```bash
# Application
ENV=production
SECRET_KEY=your-secret-key-here
DEBUG=false

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=secure-password-here
MONGODB_URL=mongodb://admin:secure-password-here@mongodb:27017/pingtopass?authSource=admin

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=redis-password-here

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services
OPENROUTER_API_KEY=your-openrouter-key

# Monitoring
ME_USERNAME=admin
ME_PASSWORD=secure-password

# SSL
SSL_EMAIL=admin@pingtopass.com
DOMAIN=pingtopass.com

# Performance
WORKERS=4
MAX_CONNECTIONS=1000
CACHE_TTL=300
```

## 7. Monitoring & Maintenance

### 7.1 Container Logs
```bash
# View logs for specific service
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 mongodb

# Save logs to file
docker-compose logs > deployment_logs_$(date +%Y%m%d).txt
```

### 7.2 Resource Monitoring
```bash
# Monitor resource usage
docker stats

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes
```

### 7.3 Scaling Services
```bash
# Scale API instances
docker-compose up -d --scale api=5

# Rolling update
docker-compose up -d --no-deps --build api
```

This Docker deployment strategy provides a robust, scalable, and production-ready containerization approach for the PingToPass platform on Vultr VPS.