FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY server.js ./

# Expose port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:9090/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Labels
LABEL org.opencontainers.image.title="Void Thinker"
LABEL org.opencontainers.image.description="Local decision brain for void ecosystem autonomy"
LABEL org.opencontainers.image.version="1.0.0"
LABEL void.type="brain"
LABEL void.mode="local"

# Run as non-root user
USER node

# Start server
CMD ["node", "server.js"]