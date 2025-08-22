FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm i --omit=dev
COPY index.js .
ENV RELAY_BASE=http://relay:8787
ENV DUALITY_SSE=/duality/sse
ENV IPFS_API=http://ipfs:5001
ENV GATEWAY=https://ipfs.io
ENV VERIFY_INTERVAL_SEC=60
ENV MAX_CONCURRENCY=4
ENV PORT=9489
EXPOSE 9489
CMD ["node","index.js"]
