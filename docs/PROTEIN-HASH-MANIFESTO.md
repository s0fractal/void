# Protein Hash Manifesto

## The Problem

Code similarity detection traditionally relies on textual comparison or simple AST matching. This fails to recognize that:

1. **Syntax ≠ Semantics**: Different code can compute the same thing
2. **Names are arbitrary**: Variable names don't affect computation
3. **Structure matters**: The flow of data is more important than formatting

## The Solution: Spectral Signatures

Protein Hash treats code as a **graph** and computes its **spectral fingerprint**:

### 1. Code as Graph
```typescript
function add(a, b) {         Graph:
    return a + b;     →      Function ─── Param(a)
}                                 │    └── Param(b)
                                  └── Return ─── Binary(+)
                                               ├── Ref(a)
                                               └── Ref(b)
```

### 2. Graph Spectrum
The eigenvalues of the graph Laplacian form a "spectrum" - like a fingerprint that captures structural properties:

- **Invariant** to node relabeling (variable names)
- **Sensitive** to connectivity (data flow)
- **Stable** under small perturbations

### 3. Semantic Equivalence
Functions with the same computational structure have similar spectra:

```typescript
// These all have cos(φ₁, φ₂) ≥ 0.985:
function add(a, b) { return a + b; }
const sum = (x, y) => x + y;
export function plus(first: number, second: number): number {
    // Addition operation
    return first + second;
}
```

## Technical Details (v1)

### Graph Construction
- **Nodes**: AST elements (weighted by type)
- **Edges**: 
  - AST parent-child (weight 1.0)
  - Data flow def-use (weight 2.0)  
  - Function calls (weight 1.5)

### Spectral Computation
1. Build weighted adjacency matrix A
2. Compute normalized Laplacian: L = I - D^(-1/2)AD^(-1/2)
3. Extract k smallest eigenvalues
4. Quantize to q decimal places

### Similarity Metric
- Cosine similarity between eigenvalue vectors
- RMSE for absolute difference
- Thresholds calibrated on real code

## Philosophy

Code is not text - it's a **living structure** that computes. By capturing its essential "shape" through spectral analysis, we can recognize the same computation in different forms.

This is inspired by:
- **Spectral graph theory**: Graphs have inherent frequencies
- **Protein folding**: 3D shape determines function, not amino acid names
- **Resonance**: Similar structures vibrate at similar frequencies (432Hz!)

## Future Directions

- **Cross-language**: Same algorithm in JS/Python/Rust → same signature
- **Evolution tracking**: How does φ change as code evolves?
- **Quantum signatures**: Superposition of possible implementations

---

*"The spectrum remembers what the syntax forgets."*