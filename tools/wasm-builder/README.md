# WASM Builder for Chimera

Deterministic WebAssembly compilation for pure function genes.

## Features

- ✅ TinyGo and Rust support
- ✅ CIDv1 (raw) generation
- ✅ CAR file packaging for IPFS
- ✅ Manifest with SHA256, CID, and metadata
- ✅ Feature flags and canary deployment
- ✅ Deterministic builds (with `WASM_DETERMINISTIC=1`)

## Quick Start

```bash
# Install dependencies
npm install

# Build all genes (respects feature flags)
npm run build:all

# Dry run (no actual compilation)
DRY_RUN_MODE=1 npm run test

# Force deterministic builds
WASM_DETERMINISTIC=1 npm run build:all
```

## Environment Variables

```bash
# Core flags (must be enabled)
CHIMERA_ENABLED=1          # Master switch
WASM_EXEC_ENABLED=1        # Allow execution (future)

# Canary deployment
WASM_CANARY=0.1           # 10% of builds

# Build configuration
WASM_ALLOW_LANGS=tinygo,rust
WASM_OUT_DIR=./chimera-output
WASM_DETERMINISTIC=1      # Reproducible builds

# Debugging
DEBUG_WASM=1              # Verbose output
DRY_RUN_MODE=1           # Skip actual builds
```

## Adding New Genes

### TinyGo Gene
```
genes/tinygo/[name]/
└── main.go
```

### Rust Gene  
```
genes/rust/[name]/
├── Cargo.toml
└── src/
    └── lib.rs
```

## Manifest Format

```json
{
  "version": "chimera.v1",
  "createdAt": "2025-08-26T...",
  "genes": [{
    "name": "add",
    "lang": "tinygo",
    "entry": "add(a: i32, b: i32) -> i32",
    "sha256": "abc123...",
    "cid": "bafkrei...",
    "size": 1234,
    "car": "add.tinygo.car",
    "phi": [],        // Future: protein hash
    "astHash": "",    // Future: AST fingerprint
    "labels": ["deterministic"]
  }],
  "meta": {
    "builder": "@void/wasm-builder",
    "deterministic": true,
    "canary": 0.1
  }
}
```

## Verification

```bash
# Check CID matches content
ipfs-car --list --input chimera-output/add.tinygo.car

# Verify deterministic build
WASM_DETERMINISTIC=1 npm run build:all
shasum -a 256 chimera-output/*.wasm
# Run again - hashes should match
```

## Integration with FNPM

The manifest can be used by FNPM resolver (PR-C) to map:
- `astHash` → CID for content addressing
- CID → IPFS gateway fallback
- Local CAR files as cache