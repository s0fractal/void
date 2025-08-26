FROM node:20-slim

WORKDIR /app

# Install system dependencies for Wasmtime
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN useradd -m -u 1001 wasm-exec
USER wasm-exec

# Expose port
EXPOSE 3456

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:3456/health || exit 1

# Start server
CMD ["node", "dist/server.js"]