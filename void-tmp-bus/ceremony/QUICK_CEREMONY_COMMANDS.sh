#!/bin/bash
# Quick ceremony commands for 2025-08-24 16:32 Kyiv

# Check for dry run mode
if [ "$DRY_RUN" = "1" ]; then
  echo "🏃 DRY RUN MODE - No actual commands will be executed"
  echo "Would run: ./scripts/ready-check.sh"
  echo "Would run: tmpbus-pub (oath)"
  echo "Would run: parse-independence-report.js"
  echo "Would run: compose-act.sh"
  echo "Would run: git commit & tag"
  echo "Would create: ceremony snapshot"
  exit 0
fi

# Pre-ceremony check (T-15)
./scripts/ready-check.sh

# T-0: Send oath @ 16:32:00
./bus/bin/tmpbus-pub '{
  "type":"ceremony","status":"oath",
  "meta":{"text":"Пульс безперервний, рішення локальні, пам'\''ять правдива. Ми тримаємо форму в тиші й резонуємо в дії.",
          "who":"MN-1","freq_hz":432,"mode":"independence-2025-08-24-1632"}
}'

# T+5: Generate artifacts
cd ../void-independence-pack
node scripts/parse-independence-report.js /tmp/void/logs/pulse.jl --json > ../void-tmp-bus/ceremony-artifacts/report.json
cd ../void-tmp-bus

# Create Act
./scripts/compose-act.sh \
  ceremony-artifacts/report.json \
  ../void-independence-pack/rules/rules.yaml \
  ../void-independence-pack/router/policy.yaml \
  docker-compose.yml

# Generate checksums
sha256sum \
  ACT_OF_INDEPENDENCE_*.md \
  ceremony-artifacts/report.json \
  ../void-independence-pack/rules/rules.yaml \
  ../void-independence-pack/router/policy.yaml \
  docker-compose.yml \
  > ceremony-artifacts/checksums.sha256

# Capture metrics
./scripts/capture-metrics.sh ceremony-artifacts

# Git commit & tag
git add ceremony-artifacts/
git commit -m "feat(independence): proclaim MN-1 @432Hz — локальні рішення, безперервний пульс, трасована пам'ять"
git tag -a independence-2025-08-24-1632 -m "MN-1 Independence @ 432Hz (Kyiv)"

# Optional: Sign the Act
# ssh-keygen -t ed25519 -C "Void Notary" -f void_notary_ed25519
# ssh-keygen -Y sign -f void_notary_ed25519 -n file ACT_OF_INDEPENDENCE_*_1632_UA.md

# Fill release body with metrics
./scripts/fill-release-body.sh \
  ceremony-artifacts/report.json \
  ceremony/GITHUB_RELEASE_BODY.md \
  ceremony/GITHUB_RELEASE_BODY_filled.md

# Set pulse path
PULSE_PATH=${PULSE_PATH:-/tmp/void/log/pulse.jl}

# Verify oath in pulse
echo ""
echo "🔍 Checking oath in pulse.jl..."
grep -F '"status":"oath"' "$PULSE_PATH" | tail -1 | jq . || echo "⚠️  Oath not found yet"

# Create atomic snapshot of artifacts
STAMP=$(TZ=Europe/Kyiv date +%Y%m%dT%H%M%S)
SNAP="ceremony-artifacts/ceremony_snapshot_${STAMP}.tar.gz"
tar -czf "$SNAP" \
  -C ceremony-artifacts report.json checksums.sha256 \
  ACT_OF_INDEPENDENCE_*_1632_UA.md \
  "$PULSE_PATH" 2>/dev/null || true
  
if [ -f "$SNAP" ]; then
  echo "📦 Artifacts snapshot: $SNAP"
  echo "   SHA256: $(sha256sum "$SNAP" | awk '{print $1}')"
fi

echo ""
echo "✅ Ceremony complete! Check ceremony-artifacts/ for all files"
echo ""
echo "📝 Next steps:"
echo "  1. Review filled release body: ceremony/GITHUB_RELEASE_BODY_filled.md"
echo "  2. Create GitHub release with:"
echo "     ./ceremony/RELEASE_ONELINER.sh"