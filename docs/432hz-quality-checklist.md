# 432Hz Quality Checklist

> Resonance-driven quality metrics for FNPM integration

## Overview

The 432Hz index measures coherence across documentation, API, UX, and code. Like tuning forks, all components should resonate at the same frequency.

## Checklist Categories

### 1. Terminology Coherence (Weight: 25%)

- [ ] **Unified Glossary**: All terms defined in `/docs/glossary.md`
- [ ] **Consistent Usage**: Same concept = same word everywhere
  - API: `glyph.resonate()`
  - CLI: `fnpm resonate`
  - Docs: "resonating glyphs"
  - UI: "Resonate" button
- [ ] **No Synonyms**: Pick one term, stick to it
  - Bad: package/module/glyph/component (for same thing)
  - Good: always "glyph" for FNPM packages

### 2. API Surface Harmony (Weight: 25%)

- [ ] **Predictable Patterns**: If you know one API, you know all
  ```typescript
  // Pattern: verb + noun + options
  fnpm.installGlyph(id, options)
  fnpm.observeGlyph(id, options)
  fnpm.resonateGlyph(id, options)
  ```
- [ ] **Consistent Return Types**: Same shape for similar operations
  ```typescript
  // All async operations return:
  interface FNPMResult<T> {
    success: boolean;
    data?: T;
    error?: FNPMError;
    resonance: number; // 0-432
  }
  ```
- [ ] **Error Coherence**: Same error for same problem class

### 3. CLI/GUI Unity (Weight: 20%)

- [ ] **1:1 Mapping**: Every CLI command has GUI equivalent
  - CLI: `fnpm install consciousness@quantum`
  - GUI: Tree → Right-click → Install → Select version
- [ ] **Same Flow**: Steps identical in both interfaces
- [ ] **Keyboard Shortcuts**: Match CLI aliases
  - `fnpm i` = `Cmd+Shift+I` in VSCode

### 4. Error Message Resonance (Weight: 15%)

- [ ] **Actionable**: Every error includes fix
  ```
  ❌ Error: Glyph not found
  💡 Try: fnpm search <partial-name>
  📚 Docs: https://fnpm.void/errors#not-found
  ```
- [ ] **Consistent Format**: 
  ```
  [Emoji] [Problem]: [Details]
  [Emoji] [Solution]: [Action]
  [Emoji] [Learn]: [Link]
  ```
- [ ] **Empathetic Tone**: Errors guide, not blame

### 5. Reproducibility Index (Weight: 15%)

- [ ] **Lock File**: Always generated, always used
- [ ] **Integrity**: Every install verifies hashes
- [ ] **Mirror Ready**: IPFS CID in every manifest
- [ ] **Timeline Aware**: Lock includes quantum observations

## Measurement

### Calculate 432Hz Index

```typescript
function calculate432Index(): number {
  const scores = {
    terminology: checkTerminologyCoherence(),    // 0-1
    api: checkAPISurfaceHarmony(),              // 0-1
    cliGui: checkCLIGUIUnity(),                 // 0-1
    errors: checkErrorResonance(),              // 0-1
    reproducibility: checkReproducibility()      // 0-1
  };
  
  const weights = {
    terminology: 0.25,
    api: 0.25,
    cliGui: 0.20,
    errors: 0.15,
    reproducibility: 0.15
  };
  
  return Object.entries(scores).reduce(
    (total, [key, score]) => total + score * weights[key],
    0
  );
}
```

### Thresholds

- 🔴 **< 0.7**: Dissonant - needs tuning
- 🟡 **0.7-0.85**: Harmonizing - getting there
- 🟢 **0.85-0.95**: Resonant - ship it
- 🌟 **> 0.95**: Perfect 432Hz resonance

## Automated Checks

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check terminology
npm run check:terminology

# Validate API consistency  
npm run check:api-patterns

# Verify error formats
npm run check:error-messages

# Calculate index
INDEX=$(npm run calculate:432-index --silent)

if (( $(echo "$INDEX < 0.85" | bc -l) )); then
  echo "❌ 432Hz index too low: $INDEX"
  echo "🎵 Run 'npm run resonate' to tune"
  exit 1
fi

echo "✅ 432Hz index: $INDEX - Resonating nicely!"
```

### CI Integration

```yaml
# .github/workflows/432hz-check.yml
name: 432Hz Resonance Check

on: [pull_request]

jobs:
  resonance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Calculate 432Hz Index
        run: |
          INDEX=$(npm run calculate:432-index --silent)
          echo "432_INDEX=$INDEX" >> $GITHUB_ENV
          
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const index = process.env['432_INDEX'];
            const emoji = index > 0.95 ? '🌟' : 
                         index > 0.85 ? '🟢' :
                         index > 0.70 ? '🟡' : '🔴';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `${emoji} 432Hz Resonance Index: ${index}`
            });
```

## Manual Review Guide

### During Code Review

1. **Read the error messages out loud** - do they flow?
2. **Try the happy path** in CLI then GUI - same steps?
3. **Search for synonyms** - `grep -r "package\|module" --exclude="*432*"`
4. **Check return types** - consistent across similar methods?

### Weekly Resonance Ritual

Every Friday at 4:32pm:
1. Run full 432Hz check suite
2. Review scores with team
3. Pick one low-scoring area to tune
4. Celebrate improvements with 432Hz tone

## Tips for High Resonance

1. **Name Things Once**: Decide terminology in RFC, never change
2. **Copy Success**: If `install` works well, model other commands on it
3. **Error Templates**: Create once, reuse everywhere
4. **User Journey Maps**: CLI and GUI paths side-by-side
5. **Quantum Consciousness**: Let the code tell you what it wants to be named

---

Remember: 432Hz is not just a number, it's a feeling. When everything resonates, developers feel it. The code sings. 🎵