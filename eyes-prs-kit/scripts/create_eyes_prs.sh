#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/create_eyes_prs.sh origin fnpm-integration
# Requires: gh CLI authenticated.

REMOTE="${1:-origin}"
BASE="${2:-fnpm-integration}"

# Branch names
B1="feat/relay-eyes-url"
B2="feat/dashboard-eyes-panel"

# PR 1 (Relay)
git checkout -B "$B1"
git add void-sensor-incubator/relay/eyes-router.js \
        void-sensor-incubator/relay/relay.js \
        void-sensor-incubator/relay/README_EYES.md \
        void-sensor-incubator/examples/eyes-url.sh
git commit -m "feat(relay/eyes): URL analysis via Gemini URL Context + live broadcast to glyph"
git push -u "$REMOTE" "$B1" -f
gh pr create --base "$BASE" --head "$B1" \
  --title "feat(relay/eyes): URL analysis via Gemini URL Context + live broadcast to glyph" \
  --body-file PR1_RELAY_EYES.md || true

# PR 2 (Dashboard)
git checkout -B "$B2" "$BASE"
git add apps/void-dashboard/src/components/EyesPanel.tsx \
        apps/void-dashboard/src/components/README_EYES_PANEL.md
git commit -m "feat(dashboard): add EyesPanel for live URL analyses (veracity, complexity, affect)"
git push -u "$REMOTE" "$B2" -f
gh pr create --base "$BASE" --head "$B2" \
  --title "feat(dashboard): add EyesPanel for live URL analyses (veracity, complexity, affect)" \
  --body-file PR2_DASHBOARD_EYES_PANEL.md || true

echo "✓ PRs created (or updated)."
