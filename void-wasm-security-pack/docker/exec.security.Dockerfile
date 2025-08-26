# Build
FROM golang:1.22-alpine AS build
RUN apk add --no-cache git
WORKDIR /src
COPY executor_security /src/executor
RUN cd /src/executor && go mod init void-wasm-exec || true
RUN cd /src/executor && go mod tidy || true
RUN cd /src/executor && go build -o /out/void-wasm-exec ./cmd/void-wasm-exec

# Runtime
FROM alpine:3.20
RUN adduser -D -H -u 10001 void && apk add --no-cache cosign
USER void
WORKDIR /app
COPY --from=build /out/void-wasm-exec /usr/local/bin/void-wasm-exec
ENV RELAY_BASE=http://relay:8787     SSE_PATH=/sse     EVENT_POST=/event     IPFS_GATEWAY=https://ipfs.io     CACHE_DIR=/tmp/void/wasm-cache     PROM_ADDR=:9490     TIMEOUT_MS=2000     MEM_MB=128     ALLOW_MODULES="wasm/ci/*,wasm/pulse/*"     ALLOW_CAPS="emit"     COSIGN_VERIFY=1     OPA_BASE=http://opa-pdp:8181     OPA_DECISION=/v1/data/void/policy/allow     WASM_DRYRUN=0
EXPOSE 9490
ENTRYPOINT ["/usr/local/bin/void-wasm-exec"]
