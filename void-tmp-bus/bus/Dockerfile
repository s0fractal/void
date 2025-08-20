FROM node:20-alpine

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create void user and directories
RUN addgroup -g 1000 void && \
    adduser -u 1000 -G void -s /bin/sh -D void && \
    mkdir -p /tmp/void /var/lib/void/spool && \
    chown -R void:void /tmp/void /var/lib/void

# Switch to void user
USER void

# Expose TCP port
EXPOSE 9478

# Environment defaults
ENV TMP_DIR=/tmp/void \
    SPOOL_DIR=/var/lib/void/spool \
    TCP_PORT=9478 \
    RELAY_HTTP=http://relay:8787/event \
    RELAY_WS=ws://relay:8787/ws

# Run tmpbus
CMD ["node", "dist/index.js"]