FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy bus client for commands
COPY ../bus/dist ./bus/dist

# Copy exporter source
COPY . .

# Build TypeScript
RUN npm run build

# Run as non-root
USER node

# Expose metrics port
EXPOSE 9479

# Environment defaults
ENV METRICS_PORT=9479 \
    POLL_INTERVAL=5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9479/health || exit 1

# Run exporter
CMD ["node", "dist/index.js"]