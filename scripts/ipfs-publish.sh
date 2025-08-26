#!/bin/bash
# 🌐 IPFS Publisher for Virus-Deconstructor manifests
# Publishes gene manifests to IPFS for distributed access

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No file specified${NC}"
    echo "Usage: $0 <manifest-file>"
    echo "Example: $0 artifacts/genes.manifest.ndjson"
    exit 1
fi

MANIFEST_FILE="$1"

# Check if file exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}❌ Error: File not found: $MANIFEST_FILE${NC}"
    exit 1
fi

# Check IPFS availability
if [ -z "$IPFS_API" ]; then
    echo -e "${YELLOW}⚠️  Warning: IPFS_API not set${NC}"
    echo "To enable IPFS publishing, set:"
    echo "  export IPFS_API='http://localhost:5001'"
    echo ""
    echo "Skipping IPFS publish (local mode only)"
    exit 0
fi

echo -e "${BLUE}🌐 IPFS Publisher for Virus-Deconstructor${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check IPFS daemon
echo -e "${GREEN}Checking IPFS daemon at $IPFS_API...${NC}"
if ! curl -s "$IPFS_API/api/v0/version" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to IPFS daemon at $IPFS_API${NC}"
    echo "Make sure IPFS daemon is running:"
    echo "  ipfs daemon"
    exit 1
fi

# Get file info
FILENAME=$(basename "$MANIFEST_FILE")
FILESIZE=$(wc -c < "$MANIFEST_FILE")
LINECOUNT=$(wc -l < "$MANIFEST_FILE")

echo -e "${GREEN}📄 File: $FILENAME${NC}"
echo -e "${GREEN}📏 Size: $FILESIZE bytes${NC}"
echo -e "${GREEN}📊 Genes: $LINECOUNT${NC}"
echo ""

# Add to IPFS
echo -e "${YELLOW}Uploading to IPFS...${NC}"
IPFS_HASH=$(curl -s -X POST "$IPFS_API/api/v0/add" \
    -F "file=@$MANIFEST_FILE" \
    | jq -r '.Hash')

if [ -z "$IPFS_HASH" ] || [ "$IPFS_HASH" == "null" ]; then
    echo -e "${RED}❌ Error: Failed to upload to IPFS${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Success! Published to IPFS${NC}"
echo ""
echo -e "${BLUE}📍 IPFS Hash: $IPFS_HASH${NC}"
echo -e "${BLUE}🌐 Gateway URLs:${NC}"
echo "  • https://ipfs.io/ipfs/$IPFS_HASH"
echo "  • https://gateway.pinata.cloud/ipfs/$IPFS_HASH"
echo "  • https://cloudflare-ipfs.com/ipfs/$IPFS_HASH"
echo ""

# Create metadata
METADATA_FILE="${MANIFEST_FILE}.meta.json"
cat > "$METADATA_FILE" << EOF
{
  "manifest": "$FILENAME",
  "ipfs_hash": "$IPFS_HASH",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "size": $FILESIZE,
  "genes": $LINECOUNT,
  "version": "virus-deconstructor-v0.1",
  "frequency": 432
}
EOF

echo -e "${GREEN}📝 Metadata saved to: $METADATA_FILE${NC}"

# Optional: Pin the hash
if command -v ipfs &> /dev/null; then
    echo -e "${YELLOW}📌 Pinning hash locally...${NC}"
    ipfs pin add "$IPFS_HASH" > /dev/null 2>&1 && \
        echo -e "${GREEN}✅ Pinned!${NC}" || \
        echo -e "${YELLOW}⚠️  Could not pin (non-critical)${NC}"
fi

# Create retrieval script
RETRIEVE_SCRIPT="${MANIFEST_FILE%.ndjson}-retrieve.sh"
cat > "$RETRIEVE_SCRIPT" << EOF
#!/bin/bash
# Retrieve this manifest from IPFS
echo "Fetching manifest from IPFS..."
curl -s "https://ipfs.io/ipfs/$IPFS_HASH" -o "$FILENAME"
echo "✅ Downloaded: $FILENAME"
EOF
chmod +x "$RETRIEVE_SCRIPT"

echo ""
echo -e "${GREEN}🎉 Publishing complete!${NC}"
echo -e "${BLUE}To retrieve later:${NC}"
echo "  ./$RETRIEVE_SCRIPT"
echo ""
echo -e "${YELLOW}✨ Your genes are now distributed across the cosmos! ✨${NC}"