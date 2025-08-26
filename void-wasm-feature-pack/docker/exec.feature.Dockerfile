# Build
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY executor_patch /src/executor
RUN cd /src/executor && go mod init void-wasm-exec || true
RUN cd /src/executor && go mod tidy || true
RUN cd /src/executor && go build -o /out/void-wasm-exec ./cmd/void-wasm-exec

# Runtime
FROM alpine:3.20
RUN adduser -D -H -u 10001 void
USER void
WORKDIR /app
COPY --from=build /out/void-wasm-exec /usr/local/bin/void-wasm-exec
ENV RELAY_BASE=http://relay:8787     SSE_PATH=/sse     EVENT_POST=/event     IPFS_GATEWAY=https://ipfs.io     CACHE_DIR=/tmp/void/wasm-cache     PROM_ADDR=:9490     TIMEOUT_MS=2000     MEM_MB=128     ALLOW_MODULES="wasm/ci/*,wasm/pulse/*"     ALLOW_CAPS="emit,kv,http"     ALLOW_HTTP_HOSTS="relay,localhost"     HTTP_RPS=5     HTTP_BURST=5     HTTP_MAX_KB=64     WASM_DRYRUN=0
EXPOSE 9490
ENTRYPOINT ["/usr/local/bin/void-wasm-exec"]
