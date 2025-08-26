FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm i --omit=dev
COPY index.js .
ENV RELAY_BASE=http://relay:8787
ENV PORT=9486
EXPOSE 9486
CMD ["node","index.js"]
