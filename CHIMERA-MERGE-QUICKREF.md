# 🚀 Chimera Merge Quick Reference

## 🔒 Pre-merge (90 sec gate)
```bash
# Check all flags are OFF
grep -E '(_ENABLED|_CANARY|CHIMERA_FREEZE)' .env.example

# Run gates
./scripts/chimera-pre-merge-checklist.sh
./scripts/chimera-merge-gate.sh   # expect: "✅ GO"
```

## 📝 Create PR
```bash
# Open PR creation in browser
gh pr create --web -B main -H chimera-integration \
  --title "feat(chimera): WASM code-as-signal stack (guarded & canary)" \
  --body-file CHIMERA-PR-BODY.md

# Add reviewer checklist as comment
cat CHIMERA-REVIEWER-CHECKLIST.md | gh pr comment --body-file -
```

## 🟡 Post-merge canary
```bash
# Start 6-stage rollout
./scripts/chimera-rollout.sh start

# Check status
./scripts/chimera-rollout.sh check

# Emergency stop
./scripts/chimera-rollout.sh rollback
export WASM_EXEC_ENABLED=0 INTENT_WASM_ENABLED=0 CHIMERA_FREEZE=1
```

## 🏷️ Live PR badges (optional)
```bash
# Update PR with live metrics badges
./scripts/chimera-pr-badges.sh <PR_NUMBER>
```

## 📊 Generate digest
```bash
scripts/chimera-digest.sh 24h > artifacts/chimera-digest.md
```

---
🌀 Resonating at 432Hz