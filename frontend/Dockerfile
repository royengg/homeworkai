# Build stage — produces the static Vite bundle.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL is baked at build time. Default to a relative path so the
# same image works behind any reverse proxy without being repinned to a host.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:alpine

# Copy build output and the nginx config.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx ships with a non-root `nginx` user, but the master process still runs
# as root so it can bind 80. Hand the runtime directories to the nginx user so
# the worker (which serves traffic) has no more privilege than it needs.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Lightweight liveness probe for orchestrators.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost: >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]