# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Environment variable substitution script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Labels
LABEL org.opencontainers.image.title="Void Dashboard"
LABEL org.opencontainers.image.description="Resonance Dashboard - Living glyph visualization at 432Hz"
LABEL org.opencontainers.image.version="1.0.0"
LABEL void.frequency="432Hz"
LABEL void.type="dashboard"

# Use custom entrypoint for env var substitution
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]