#!/bin/bash
# Final preflight check - run 1 minute before ceremony

echo "🔍 FINAL PREFLIGHT CHECK"
echo "======================="
echo ""

# Timezone and sync check
echo "⏰ Time Zone Check:"
echo "   Current time: $(TZ=Europe/Kyiv date -Iseconds)"
timedatectl 2>/dev/null | egrep 'Time zone|NTP service|System clock' || echo "   (timedatectl not available)"
echo ""

# GitHub CLI auth
echo "🔐 GitHub Auth:"
gh auth status || echo "   ⚠️  GitHub CLI not authenticated!"
echo ""

# Git config
echo "📝 Git Config:"
echo "   Name: $(git config user.name || echo 'NOT SET')"
echo "   Email: $(git config user.email || echo 'NOT SET')"
echo ""

# Check if tag already exists
TAG="independence-2025-08-24-1632"
echo "🏷️  Tag Check:"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "   ⚠️  Tag $TAG already exists"
else
  echo "   ✅ Tag $TAG is available"
fi
echo ""

# Quick service check
echo "🚀 Services:"
echo -n "   TmpBus: "
nc -z localhost 9478 2>/dev/null && echo "✅" || echo "❌"
echo -n "   Exporter: "
nc -z localhost 9479 2>/dev/null && echo "✅" || echo "❌"
echo -n "   Relay: "
nc -z localhost 8787 2>/dev/null && echo "✅" || echo "⚠️  (OK if testing offline)"
echo ""

echo "Ready for ceremony? Check all ✅ above!"