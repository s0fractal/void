#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
BASE="${2:-main}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1"; exit 1; }; }

need git
need gh

gh auth status || { echo "Run 'gh auth login' first"; exit 1; }

# PR 1: foundation
git checkout -b feat/antigone-core || git checkout feat/antigone-core
git add tools/antigone glyphs/core.yaml .github/workflows/antigone-ci.yml scripts/train_lora.sh README_ANTIGONE.md || true
git commit -m "feat(antigone): ethical firewall + genome distiller + tests + docker" || true
git push -u "$REMOTE" HEAD

gh pr create \
  --base "$BASE" \
  --title "feat(antigone): ethical firewall + genome distiller + tests + docker" \
  --body-file pr/PR_BODY_ANTIGONE_FOUNDATION.md || true

# PR 2: rollout
git checkout "$BASE"
git checkout -b feat/antigone-rollout || git checkout feat/antigone-rollout
git add prom/rules/antigone_rules.yml docs/ANTIGONE_ROLLOUT_GUIDE.md pr/CHANGELOG_ENTRY.md || true
git commit -m "feat(antigone): relay integration + grafana annotations + prometheus alerts" || true
git push -u "$REMOTE" HEAD

gh pr create \
  --base "$BASE" \
  --title "feat(antigone): relay integration + grafana annotations + prometheus alerts" \
  --body-file pr/PR_BODY_ANTIGONE_ROLLOUT.md || true

echo "✅ PRs pushed. Add labels with:"
echo "  gh pr edit <num> --add-label 'enhancement,security,observability,antigone'"
