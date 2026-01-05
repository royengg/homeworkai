FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use shell to replace PORT and start nginx
CMD sh -c "sed -i 's/listen 80;/listen ${PORT:-80};/g' /etc/nginx/conf.d/default.conf && sed -i 's/listen \[::\]:80;/listen [::]:${PORT:-80};/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
