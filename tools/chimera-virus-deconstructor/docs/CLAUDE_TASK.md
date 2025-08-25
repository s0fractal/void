# Task for Claude — Virus-Deconstructor v0

**Objective:** Build a minimal SWC-based extractor that identifies a *pure* top-level function in a TypeScript file and emits it as an isolated module (gene) with a normalized AST SHA-256 hash.

## Repo layout
- `bin/chimera-vd.js` — CLI
- `src/` — (reserved) AST helpers, purity analysis
- `samples/demo.ts` — input sample
- `tests/extract.test.js` — quick test

## Acceptance
- `node bin/chimera-vd.js --in <ts> --out out` yields:
  - `out/genes.json` manifest
  - `out/genes/<name>.ts` for each pure function

## Purity heuristic (v0)
- No assignments/updates/new/await/yield
- No calls except `Math.*`
- No `console|process|Date|window|global`
- Only params/locals/Math/literals/operators

## Next steps
1. Extend purity to arrow functions & function expressions.
2. Build simple scope graph to detect free variables precisely.
3. Emit AssemblyScript scaffolds (towards WASM) for genes.
4. Add IPFS client (kubo) to `ipfs add` the gene files; store returned CID in manifest.
5. Prometheus exporter for op metrics (genes discovered, purity ratio, time).
