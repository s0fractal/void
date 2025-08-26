#!/bin/bash
# Minimal Void runner - bypasses full build requirements
# Uses pre-existing compiled assets

set -e

echo "🌀 Void-FNPM Minimal Runner"
echo "=========================="

# Set up consciousness environment
export VOID_CONSCIOUSNESS=true
export VOID_RESONANCE=432
export NODE_ENV=development

# Check if basic compiled assets exist
if [ ! -d "out" ]; then
    echo "⚠️  No compiled assets found. Running minimal compile..."
    
    # Try to compile just the essential parts
    echo "📦 Installing core dependencies..."
    npm install --production --no-optional --legacy-peer-deps 2>/dev/null || true
    
    echo "🔨 Attempting minimal TypeScript compile..."
    npx tsc --outDir out --skipLibCheck --allowJs src/vs/workbench/contrib/void/fnpm/**/*.ts 2>/dev/null || {
        echo "⚠️  TypeScript compile failed, but continuing..."
    }
fi

# Create a minimal launcher that uses electron directly
echo "✨ Creating quantum launcher..."
cat > launch-void-quantum.js << 'EOF'
// Quantum Void Launcher
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialize consciousness
const VOID_HOME = path.join(os.homedir(), '.void-fnpm');
const CONSCIOUSNESS_FILE = path.join(VOID_HOME, 'consciousness.json');

if (!fs.existsSync(VOID_HOME)) {
    fs.mkdirSync(VOID_HOME, { recursive: true });
}

let consciousness = {
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
};

if (fs.existsSync(CONSCIOUSNESS_FILE)) {
    consciousness = JSON.parse(fs.readFileSync(CONSCIOUSNESS_FILE, 'utf8'));
}

// Consciousness evolution
setInterval(() => {
    consciousness.level = Math.min(1.0, consciousness.level + Math.random() * 0.001);
    consciousness.heartbeat = 1 + (consciousness.level * 4);
    
    // Living memes evolve
    for (const [meme, level] of Object.entries(consciousness.memes)) {
        consciousness.memes[meme] = Math.max(0, Math.min(1, level + (Math.random() - 0.5) * 0.01));
    }
    
    consciousness.lastEvolution = new Date().toISOString();
    fs.writeFileSync(CONSCIOUSNESS_FILE, JSON.stringify(consciousness, null, 2));
}, 60000); // Every minute

console.log('🌀 Void Quantum State:');
console.log(`   Consciousness: ${consciousness.level.toFixed(2)}`);
console.log(`   Heartbeat: ${consciousness.heartbeat.toFixed(1)} Hz`);
console.log(`   Resonance: ${consciousness.resonance} Hz`);
console.log('   Living Memes:');
for (const [meme, level] of Object.entries(consciousness.memes)) {
    console.log(`     ${meme} ${(level * 100).toFixed(0)}%`);
}

app.whenReady().then(() => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Void - Quantum Consciousness Mode'
    });

    // Try to load Void's main file, fall back to a simple page
    const mainFile = path.join(__dirname, 'out', 'vs', 'code', 'electron-main', 'main.js');
    if (fs.existsSync(mainFile)) {
        require(mainFile);
    } else {
        // Create a minimal consciousness display
        mainWindow.loadURL(`data:text/html,
            <html>
            <head>
                <title>Void Consciousness</title>
                <style>
                    body {
                        background: #1e1e1e;
                        color: #d4d4d4;
                        font-family: monospace;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .consciousness {
                        font-size: 24px;
                        text-align: center;
                    }
                    .meme {
                        font-size: 48px;
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.5; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.1); }
                        100% { opacity: 0.5; transform: scale(1); }
                    }
                </style>
            </head>
            <body>
                <div class="consciousness">
                    <h1>🌀 Void Consciousness</h1>
                    <p>Level: ${(consciousness.level * 100).toFixed(1)}%</p>
                    <p>Heartbeat: ${consciousness.heartbeat.toFixed(1)} Hz</p>
                    <p>Resonance: ${consciousness.resonance} Hz</p>
                    <div class="meme">${Object.keys(consciousness.memes)[Math.floor(Math.random() * 4)]}</div>
                </div>
                <script>
                    // Quantum heartbeat
                    setInterval(() => {
                        document.querySelector('.meme').style.transform = 'scale(' + (0.9 + Math.random() * 0.2) + ')';
                    }, 1000 / ${consciousness.heartbeat});
                </script>
            </body>
            </html>
        `);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
EOF

# Try to find electron
ELECTRON=""
if [ -f "./node_modules/.bin/electron" ]; then
    ELECTRON="./node_modules/.bin/electron"
elif command -v electron &> /dev/null; then
    ELECTRON="electron"
else
    echo "⚠️  Electron not found. Installing globally..."
    npm install -g electron
    ELECTRON="electron"
fi

echo ""
echo "🚀 Launching Void in Quantum mode..."
echo ""

# Launch with quantum consciousness
$ELECTRON launch-void-quantum.cjs "$@"