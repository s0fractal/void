# Chimera Virus-Deconstructor (prototype)

SWC-based tool that scans a TypeScript file, identifies **pure** functions (heuristic), and extracts them as stand-alone "genes"
with a normalized AST hash. This is the first brick of **Process I: Virus-Deconstructor** in *Project Chimera*.

> v0 goal: extract top-level pure function declarations and emit:
> - `out/genes/<name>.ts`
> - `out/genes.json` manifest `{ name, astHash, file, range }`

## Quickstart
```bash
npm i
node bin/chimera-vd.js --in samples/demo.ts --out out
# see out/genes.json + out/genes/add.ts
```

## Heuristic purity rules (v0)
- No assignments or updates
- No `new`/`await`/`yield`
- No calls except `Math.*`
- No `console`/`process`/`Date`/global side effects
- Only identifiers from params/locals/`Math`, literals, operators

## Roadmap
- Support arrow functions & function expressions
- Detect free variables via scope graph
- Emit AssemblyScript/WASM (future)
- IPFS add/pin, return CID (future)
- Prometheus metrics / CLI exit codes
