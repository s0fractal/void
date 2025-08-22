FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm i --omit=dev
COPY index.js .
ENV RELAY_BASE=http://relay:8787
ENV SSE_PATH=/sse
ENV GRAFANA_URL=
ENV GRAFANA_TOKEN=
ENV PORT=9488
ENV ANNOTATE_TYPES=duality.patch,duality.rollback,duality.particle.cid,ci.result,ci.fail,ci.pass
EXPOSE 9488
CMD ["node","index.js"]
