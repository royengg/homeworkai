# syntax=docker/dockerfile:1

# Install all dependencies once for the TypeScript build and Prisma client
# generation.
FROM node:20-bookworm-slim AS dependencies

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# Build stage — compiles TypeScript to dist/ via tsc.
FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-dejavu-core fonts-noto-core \
    openssl tini \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Production dependencies only — keeps the image lean.
COPY package*.json ./
RUN npm ci --omit=dev

# Prisma client + compiled application come from the build stages.
COPY --from=dependencies /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=dependencies /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Non-root runtime — the application only reads /app and writes transient logs
# under /tmp, so recursively changing ownership of the large Chromium/Node
# layer is unnecessary.
RUN groupadd --system app \
    && useradd --system --gid app --home-dir /home/app --create-home app
ENV HOME=/home/app
USER app

EXPOSE 3000

# tini reaps zombie processes when child workers die.
ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]

# Compose overrides this command for the worker service.
CMD ["node", "dist/app.js"]
