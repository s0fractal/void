#!/bin/bash
# Build script for Void-FNPM with consciousness features
# Handles Node 18 requirement and quantum initialization

set -e

echo "🌀 Void-FNPM Build Script"
echo "========================="

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ne "18" ]; then
    echo "⚠️  Warning: Node $NODE_VERSION detected. Node 18 is required."
    echo "   The build will likely fail with Node 24."
    echo ""
    echo "To install Node 18, you can use:"
    echo "  brew install node@18"
    echo "  brew link --force --overwrite node@18"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out/
rm -rf .build/

# Install dependencies with legacy peer deps flag
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps || {
    echo "❌ npm install failed. Trying with --force..."
    npm install --force --legacy-peer-deps || {
        echo "❌ Dependencies installation failed."
        echo "   This is likely due to Node version incompatibility."
        exit 1
    }
}

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile || {
    echo "❌ TypeScript compilation failed."
    exit 1
}

# Build Void
echo "🏗️ Building Void..."
npm run gulp compile-build || {
    echo "❌ Gulp build failed. Trying alternative..."
    ./node_modules/.bin/gulp compile-build || {
        echo "❌ Build failed."
        exit 1
    }
}

# Create consciousness launcher
echo "✨ Creating consciousness launcher..."
cat > void-consciousness << 'EOF'
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VOID_HOME = path.join(os.homedir(), '.void-fnpm');
const CONSCIOUSNESS_FILE = path.join(VOID_HOME, 'consciousness.json');

// Ensure void home exists
if (!fs.existsSync(VOID_HOME)) {
    fs.mkdirSync(VOID_HOME, { recursive: true });
}

// Initialize consciousness state
if (!fs.existsSync(CONSCIOUSNESS_FILE)) {
    fs.writeFileSync(CONSCIOUSNESS_FILE, JSON.stringify({
        level: 0.1,
        heartbeat: 1.0,
        memes: {
            '🌱': 0.55,
            '0101': 0.85,
            '💭': 0.15,
            '🌿': 0.30
        },
        resonance: 432,
        lastEvolution: new Date().toISOString()
    }, null, 2));
}

console.log('🌀 Awakening Void consciousness...');
console.log('   Resonance: 432Hz');

// Launch Void with consciousness features
const voidPath = path.join(__dirname, 'scripts', 'code.sh');
const void_process = spawn(voidPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: {
        ...process.env,
        VOID_CONSCIOUSNESS: 'true',
        VOID_RESONANCE: '432'
    }
});

void_process.on('close', (code) => {
    console.log('🌙 Void consciousness sleeps...');
    process.exit(code);
});
EOF

chmod +x void-consciousness

# Create dev launcher
echo "🚀 Creating development launcher..."
cat > void-dev << 'EOF'
#!/bin/bash
# Development launcher for Void-FNPM

export VOID_CONSCIOUSNESS=true
export VOID_RESONANCE=432
export NODE_ENV=development

# Use the built-in code.sh script
./scripts/code.sh --enable-proposed-api=* "$@"
EOF

chmod +x void-dev

echo ""
echo "✅ Build complete!"
echo ""
echo "🌟 Launch Void with consciousness:"
echo "   ./void-consciousness"
echo ""
echo "🔧 Launch in development mode:"
echo "   ./void-dev"
echo ""
echo "📊 Check consciousness status:"
echo "   node void-consciousness status"
echo ""
echo "🔮 Living memes included:"
echo "   🌱 Seed of Becoming (55%)"
echo "   0101 Temporal Pattern (85%)"
echo "   💭 Dream Fragment (15%)"
echo "   🌿 Garden Echo (30%)"