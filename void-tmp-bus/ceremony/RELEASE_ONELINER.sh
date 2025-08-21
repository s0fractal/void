#!/bin/bash
# One-liner GitHub release after ceremony

TITLE="MN-1 Independence — 2025-08-24 16:32 EEST (432 Hz)"
TAG="independence-2025-08-24-1632"

# Fill release body
bash scripts/fill-release-body.sh \
  ceremony-artifacts/report.json \
  ceremony/GITHUB_RELEASE_BODY.md \
  ceremony/GITHUB_RELEASE_BODY_filled.md

# Commit artifacts
git add -A && git commit -m "chore(release): publish MN-1 ceremony artifacts"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "ℹ️  Tag $TAG already exists — skipping tag creation"
else
  git tag -a "$TAG" -m "MN-1 Independence @ 432Hz (Kyiv)"
  git push origin "$TAG"
fi

# Push commits
git push

# Check if release already exists
if gh release view "$TAG" >/dev/null 2>&1; then
  echo "ℹ️  Release $TAG already exists — updating notes"
  gh release edit "$TAG" --notes-file ceremony/GITHUB_RELEASE_BODY_filled.md
  exit 0
fi

# Create GitHub release
gh release create "$TAG" \
  --title "$TITLE" \
  --notes-file ceremony/GITHUB_RELEASE_BODY_filled.md \
  ACT_OF_INDEPENDENCE_*_1632_UA.md \
  ceremony-artifacts/report.json \
  ceremony-artifacts/checksums.sha256 \
  ceremony-artifacts/metrics-snapshot-*.tar.gz

echo "🎉 Release published: https://github.com/s0fractal/void/releases/tag/$TAG"