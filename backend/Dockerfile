FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y redis-server wget curl ca-certificates && \
    wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio && \
    wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc && \
    chmod +x /usr/local/bin/minio /usr/local/bin/mc && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN chmod +x init-minio.sh

RUN mkdir -p /data/minio

EXPOSE 3000

CMD ["pm2-runtime", "ecosystem.config.js"]
