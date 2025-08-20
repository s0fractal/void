#!/bin/sh
# Docker entrypoint for environment variable substitution

# Create env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  RELAY_URL: "${RELAY_URL:-}",
  MODE: "${MODE:-ws}",
  IPFS_GATEWAY: "${IPFS_GATEWAY:-https://cloudflare-ipfs.com/ipfs/}",
  IPFS_CIDS: "${IPFS_CIDS:-}"
};
EOF

# Inject env-config.js into index.html if not already present
if ! grep -q "env-config.js" /usr/share/nginx/html/index.html; then
  sed -i 's|</head>|<script src="/env-config.js"></script></head>|' /usr/share/nginx/html/index.html
fi

# Execute the original command
exec "$@"