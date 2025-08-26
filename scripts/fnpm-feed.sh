#!/bin/bash

# 🌀 FNPM Editor Feeder - nom nom nom!
# Feed code editors to Void for absorption

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🍽️ FNPM EDITOR FEEDER v0.1"
echo "========================"
echo ""

# Compile TypeScript first
echo "📦 Compiling FNPM CLI tools..."
cd "$PROJECT_ROOT"
npm run compile-cli 2>/dev/null || npm run compile 2>/dev/null || true

# Run the editor hunter
echo ""
node "$PROJECT_ROOT/out/vs/workbench/contrib/void/fnpm/cli/feed-editor.js" "$@" || \
  ts-node "$PROJECT_ROOT/src/vs/workbench/contrib/void/fnpm/cli/feed-editor.ts" "$@"