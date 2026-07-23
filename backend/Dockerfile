# Build stage — compiles TypeScript to dist/ via tsc.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates openssl tini \
    && rm -rf /var/lib/apt/lists/*

# pm2 lets us run the API and worker as a single coordinated process tree.
RUN npm install -g pm2

WORKDIR /app

# Production dependencies only — keeps the image lean.
COPY package*.json ./
RUN npm ci --omit=dev

# Prisma client + schema come from the builder stage (prisma generate writes
# into node_modules, so we re-run it here to keep the runtime stage's
# node_modules self-sufficient).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY ecosystem.config.prod.js ./

# Non-root runtime — drop to a dedicated user for the worker and API.
RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && chown -R app:app /app
USER app

EXPOSE 3000

# tini reaps zombie processes when child workers die.
ENTRYPOINT ["/usr/bin/tini", "--"]

# Run both the API and the worker through pm2-runtime. They scale together
# for a single-VPS deployment; split into separate containers if you need to
# scale them independently.
CMD ["pm2-runtime", "ecosystem.config.prod.js"]