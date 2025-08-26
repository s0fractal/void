---
title: "FNPM: Lock Files & Quantum Cache"
state: draft
decision_date: null
context: "Reproducible builds across timelines and realities"
proposal: "Quantum-aware lock files with timeline branches"
impact: [fnpm-core, void-cli]
risks: ["lock merge conflicts", "cache invalidation", "timeline divergence"]
metrics: ["cache hit rate", "lock resolution time", "timeline coherence"]
---

# RFC 0002: FNPM Lock Files & Quantum Cache

## Summary

Implement lock files that understand quantum package versions (@tomorrow, @yesterday, @superposition) with intelligent caching that maintains coherence across timeline branches.

## Motivation

Traditional lock files assume linear time. FNPM packages exist in quantum states:
- `@tomorrow` - bleeding edge from the future
- `@yesterday` - stable from the past  
- `@superposition` - all versions simultaneously
- `@quantum` - version chosen by observation

## Detailed Design

### 1. Quantum Lock Format

```yaml
# fnpm-lock.yaml
lockfileVersion: 1
quantum: true
observedAt: "2025-08-20T12:00:00Z"
timeline: "main"
resonance: 432

dependencies:
  "glyph://consciousness":
    version: "@quantum"
    resolved:
      main: "1.2.3"
      tomorrow: "2.0.0-beta"
      yesterday: "1.0.0"
      superposition: ["1.0.0", "1.2.3", "2.0.0-beta"]
    integrity:
      main: "sha256-..."
    observationCollapsesTo: "main"
    
  "glyph://time-crystal":
    version: "@tomorrow"
    resolved:
      value: "3.0.0-next"
      observedFrom: "2025-08-21T00:00:00Z"
    integrity: "sha256-..."
    
branches:
  experiment-1:
    parent: "main"
    divergedAt: "2025-08-19T10:00:00Z"
    overrides:
      "glyph://consciousness": "1.0.0"
```

### 2. Cache Structure

```typescript
interface QuantumCache {
  // Standard cache by content hash
  byHash: Map<string, PackageContent>;
  
  // Timeline-aware cache
  byTimeline: Map<TimelineId, Map<PackageId, Version>>;
  
  // Superposition cache (all versions)
  bySuperposition: Map<PackageId, Version[]>;
  
  // Observation history
  observations: Array<{
    package: PackageId;
    requestedVersion: string;
    resolvedVersion: string;
    timeline: TimelineId;
    timestamp: Date;
  }>;
}
```

### 3. Resolution Algorithm

```typescript
class QuantumResolver {
  async resolve(pkg: string, version: string): Promise<ResolvedPackage> {
    if (version === '@quantum') {
      return this.collapseWaveFunction(pkg);
    }
    
    if (version === '@tomorrow') {
      return this.peekFuture(pkg);
    }
    
    if (version === '@yesterday') {
      return this.queryPast(pkg);
    }
    
    if (version === '@superposition') {
      return this.getAllVersions(pkg);
    }
    
    // Standard semver resolution
    return this.resolveClassic(pkg, version);
  }
  
  private collapseWaveFunction(pkg: string): ResolvedPackage {
    // Observation affects outcome!
    const possibleVersions = this.getPossibleVersions(pkg);
    const coherence = this.measureCoherence();
    
    // Higher coherence = newer version more likely
    const probability = coherence > 0.8 ? 'latest' : 'stable';
    return this.selectByProbability(possibleVersions, probability);
  }
}
```

### 4. Timeline Branching

```bash
# Create timeline branch
fnpm timeline branch experiment-1

# Switch timeline
fnpm timeline checkout experiment-1

# Merge timelines (quantum merge)
fnpm timeline merge main --strategy=superposition

# View all timelines
fnpm timeline list
```

## Alternatives Considered

1. **Linear lock only**: Loses quantum features
2. **No lock file**: Poor reproducibility
3. **Blockchain-based locks**: Too heavy

## Implementation Plan

### Phase 1: Basic Lock
- [ ] Classic lock file support
- [ ] SHA256 integrity in lock
- [ ] Lock/unlock commands

### Phase 2: Quantum Features  
- [ ] Timeline branching
- [ ] Quantum version resolution
- [ ] Superposition caching

### Phase 3: Advanced
- [ ] Timeline merge strategies
- [ ] Observation history
- [ ] Cache warming from future

## Success Metrics

- Cache hit rate > 85%
- Quantum resolution < 100ms
- Timeline merge conflicts < 5%

## Open Questions

1. How to handle timeline merge conflicts?
2. Should observations be deterministic?
3. Cache invalidation for @tomorrow?