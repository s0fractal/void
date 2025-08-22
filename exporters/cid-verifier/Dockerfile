FROM node:20-alpine
WORKDIR /app
COPY index.js .
RUN npm init -y >/dev/null 2>&1 && npm i --omit=dev express@4.19.2 node-fetch@3.3.2 prom-client@15.1.3 multiformats@12.1.3
ENV RELAY_BASE=http://relay:8787
ENV DUALITY_SSE=/duality/sse
ENV IPFS_API=http://ipfs:5001
ENV GATEWAYS=https://ipfs.io,https://cloudflare-ipfs.com
ENV VERIFY_INTERVAL_SEC=60
ENV LABEL_GATEWAY=true
ENV GW_TIMEOUT_MS=4000
ENV DIGEST=none
ENV DIGEST_MAX_BYTES=1048576
ENV PORT=9489
EXPOSE 9489
CMD ["node","index.js"]
