FROM node:20-bookworm-slim

# Install Redis & MinIO
RUN apt-get update && apt-get install -y redis-server wget ca-certificates && \
    wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Setup Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code
COPY . .

# Create MinIO data directory
RUN mkdir -p /data/minio

# Expose API port
EXPOSE 3000

# Start all services with PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
