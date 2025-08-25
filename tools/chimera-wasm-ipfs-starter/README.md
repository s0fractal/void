# Chimera WASM + IPFS Starter

Compile **pure math-ish genes** (TypeScript/AssemblyScript) to WebAssembly and derive **CIDv1 (raw)** + **CAR** for IPFS.

> Scope v0: numeric functions only (`number` params/return), `Math.*` allowed, no imports/syscalls.

## Quickstart
```bash
npm i
npm run build:all
# outputs:
# - out/add.wasm
# - out/add.cid.txt  (CIDv1 raw)
# - out/add.car      (IPFS CAR file)
# - out/manifest.json (mapping astHash→cid/size/sha256)
```

## Integrate with FNPM
- Use `out/manifest.json` entries as morphism targets.
- Pin CIDs in your IPFS node or gateway; publish a genome (tree of CIDs).

## Notes
- For general JS/TS, you'll need lifting/lowering & host ABI. This starter is for **pure** numeric functions compiled as **standalone WASM**.
