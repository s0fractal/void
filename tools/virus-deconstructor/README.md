# 🦠 Virus-Deconstructor v0.1

> Extract pure functions from JS/TS code for WASM compilation

## What it does

The Virus-Deconstructor scans JavaScript/TypeScript code and:
1. **Extracts** pure functions (no side effects, no external deps)
2. **Computes** canonical AST hash for each function
3. **Outputs** NDJSON manifest for WASM builder/FNPM consumption

## Installation

```bash
cd tools/virus-deconstructor
cargo build --release
```

## Usage

```bash
# Scan a directory for pure functions
./target/release/virus-deconstructor scan \
  --root ../../apps/first-node/src \
  --out ../../artifacts/genes.manifest.ndjson

# Optional: publish to IPFS
bash ../../scripts/ipfs-publish.sh ../../artifacts/genes.manifest.ndjson
```

## Output Format

Each line in the NDJSON manifest:
```json
{
  "name": "add",
  "hash": "sha256:abc123...",
  "ast_hash": "canonical:def456...",
  "path": "src/math/operations.ts",
  "line": 42,
  "pure": true,
  "params": ["a", "b"],
  "return_type": "number",
  "body": "return a + b;"
}
```

## Purity Rules

A function is considered "pure" if:
- ✅ No external variable access
- ✅ No mutations
- ✅ No async/await
- ✅ No I/O operations
- ✅ No random/Date/Math.random
- ✅ Deterministic output

## Safety

- All scanning is **read-only**
- No code modification
- Disabled by default (requires explicit CLI invocation)
- Canonical AST hashing for reproducibility

## Future Enhancements

- [ ] Support for more complex pure patterns
- [ ] Integration with Protein Hash
- [ ] Direct WASM compilation pipeline
- [ ] Quantum function detection

---

*Part of the Chimera WASM ecosystem @ 432Hz*