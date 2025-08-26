# FNPM WASM Resolution

CID-based package resolution for WebAssembly morphisms.

## Architecture

```
┌─────────────────┐
│   Morphism      │
│  {cid|astHash}  │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Resolver │
    └────┬────┘
         │
    ┌────▼────────┐
    │   Index     │ ← manifest.json files
    └────┬────────┘
         │ not found
    ┌────▼────────┐
    │   Cache     │ ← ~/.fnpm/cache/wasm/
    └────┬────────┘
         │ miss
    ┌────▼────────┐
    │    IPFS     │ ← localhost:5001
    └────┬────────┘
         │ fail
    ┌────▼────────┐
    │ HTTP Gateway│ ← ipfs.io, cloudflare
    └─────────────┘
```

## Configuration

All features **disabled by default**:

```bash
export FNPM_WASM_ENABLED=1              # Master switch
export FNPM_CID_RESOLVE_CANARY=0.1      # 10% canary
export FNPM_MANIFEST_DIRS=./chimera-output
export FNPM_IPFS_API=http://127.0.0.1:5001
export FNPM_HTTP_GATEWAYS=https://ipfs.io
```

## Usage

### CLI
```bash
# Pull WASM by CID
fnpm wasm pull bafkreibhmtmv24yn2zu7udv53bwwvgrylzhbep2e52p72tly7wjiufzpom

# Pull by AST hash
fnpm wasm pull 0e29725737fdb0c5cfd39cc31fcfbddd3f327a943695e402212bc9920dc1229a

# Check resolution plan
fnpm resolve morphisms/add.json
```

### Programmatic
```typescript
import { CidResolver } from '@void/fnpm-core/resolution';
import { getFnpmConfig } from '@void/fnpm-core/config';

const config = getFnpmConfig();
const resolver = new CidResolver(config);
await resolver.init();

const result = await resolver.resolve({
  cid: 'bafkrei...'
});

console.log(result.path);  // /home/user/.fnpm/cache/wasm/ba/fk/bafkrei...wasm
```

## Security

1. **Hash Verification**: SHA256 + CID double-check
2. **Size Limits**: Default 50MB max per module
3. **Timeout Protection**: 5s default, configurable
4. **Canary Deployment**: Gradual rollout
5. **Cache Integrity**: Periodic verification

## Metrics

Prometheus metrics available:
- `void_fnpm_wasm_fetch_total{source,status}`
- `void_fnpm_wasm_fetch_duration_ms`
- `void_fnpm_wasm_validation_fail_total{reason}`
- `void_fnpm_cache_size_bytes`

## Troubleshooting

### Module not found
- Check manifest directories
- Verify CID is correct
- Try manual IPFS: `ipfs cat <cid>`

### Verification failures
- SHA256 mismatch: File corrupted
- CID mismatch: Wrong content
- Size mismatch: Incomplete download

### Slow downloads
- Check gateway health: `curl -I https://ipfs.io`
- Use local IPFS node
- Increase timeout: `FNPM_FETCH_TIMEOUT_MS=30000`