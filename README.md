# Void + Chimera Integration

A self-aware editor that evolves through pure function extraction and WebAssembly compilation.

## ⚠️ Experimental Features

Chimera integration is **EXPERIMENTAL** and disabled by default. See [CHIMERA-ROLLOUT-PLAN.md](docs/CHIMERA-ROLLOUT-PLAN.md) for safe deployment strategy.

### Quick Setup

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Enable features progressively:
   ```bash
   # Development (dry-run only)
   CHIMERA_ENABLED=1 DRY_RUN_MODE=1 npm run dev
   
   # Alpha testing (1% canary)
   CHIMERA_ENABLED=1 CHIMERA_CANARY=0.01 npm run dev
   ```

## 🧬 Chimera Features

- **Virus-Deconstructor**: Extract pure functions from any codebase
- **WASM Compilation**: Convert to universal WebAssembly modules  
- **Protein Hash**: Semantic fingerprints for code similarity
- **IPFS Storage**: Decentralized, content-addressed genes
- **FNPM Integration**: Package manager for composable morphisms

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
