FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm i --omit=dev
COPY index.js .
ENV RELAY_BASE=http://relay:8787
ENV IPFS_API=http://ipfs:5001
ENV PIN=true
ENV PORT=9487
EXPOSE 9487
CMD ["node","index.js"]
