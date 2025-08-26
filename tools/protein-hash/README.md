# Protein Hash

Spectral code signatures for semantic equivalence detection.

## Overview

Protein Hash computes a spectral "fingerprint" (φ) for TypeScript functions based on their semantic structure, not syntax. Functions with identical logic but different formatting, variable names, or comments will have similar signatures.

## Algorithm (v1)

1. **Parse** TypeScript to AST
2. **Normalize** the AST:
   - Rename identifiers to canonical form (v1, v2, ...)
   - Sort commutative operations
   - Remove comments and formatting
3. **Build** weighted graph from AST:
   - Nodes: AST elements (functions, parameters, operations)
   - Edges: Parent-child (1.0), data-flow (2.0), calls (1.5)
4. **Compute** normalized Laplacian spectrum
5. **Extract** k eigenvalues as signature
6. **Quantize** to specified precision

## Installation

```bash
cargo build --release
```

## Usage

### Compute signature
```bash
protein-hash compute examples/add_a.ts --k 16 --quant 6
```

### Batch compute
```bash
protein-hash compute-dir examples/ --jsonl > signatures.jsonl
```

### Compare functions
```bash
protein-hash compare examples/add_a.ts examples/add_b.ts
# {"cos": 0.998, "rmse": 0.002}
```

### Patch manifest
```bash
protein-hash patch-manifest chimera-output/manifest.json --src signatures.jsonl
```

## Environment Variables

- `PROTEIN_HASH_ENABLED=1` - Enable the tool (disabled by default)
- `PROTEIN_HASH_K=16` - Number of eigenvalues
- `PROTEIN_HASH_QUANT=6` - Decimal precision
- `PROTEIN_HASH_CANARY=0.1` - Canary percentage

## Similarity Thresholds

- `cosine ≥ 0.985` - Equivalent/twins
- `0.95 ≤ cosine < 0.985` - Very similar
- `0.85 ≤ cosine < 0.95` - Similar
- `cosine < 0.85` - Different

## Examples

The `examples/` directory contains test functions demonstrating invariance:

- `add_a.ts`, `add_b.ts`, `add_arrow.ts` - Same addition logic, different syntax
- `mul_commute_1.ts`, `mul_commute_2.ts` - Commutative operation normalization