# WASM Module Signing & Verification

## Sign WASM blob in CI
```bash
cosign sign-blob \
  --output-signature dist/genes/add.wasm.sig \
  --output-certificate dist/genes/add.wasm.pem \
  dist/genes/add.wasm
```

## Verify before execution (in wasm-exec / resolver hook)
```bash
cosign verify-blob \
  --signature dist/genes/add.wasm.sig \
  --certificate dist/genes/add.wasm.pem \
  --certificate-identity "https://github.com/s0fractal/void/.github/workflows/..." \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  dist/genes/add.wasm
```
