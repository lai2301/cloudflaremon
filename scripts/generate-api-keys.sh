#!/bin/bash

# Script to generate API_KEYS secret in the correct format
# This ensures the JSON is valid and compatible with GitHub Actions

echo "🔑 Generating API Keys for GitHub Secrets"
echo "=========================================="
echo ""

# Generate keys for each service in services.json
SERVICE_IDS=$(node -e "
  const config = require('./services.json');
  const ids = config.services.map(s => s.id);
  console.log(ids.join(' '));
")

declare -A KEYS

echo "Generating keys for services: $SERVICE_IDS"
echo ""

for SERVICE_ID in $SERVICE_IDS; do
  KEY=$(openssl rand -base64 32)
  KEYS[$SERVICE_ID]=$KEY
  echo "✅ Generated key for: $SERVICE_ID"
done

echo ""
echo "=========================================="
echo "📋 JSON Format (for GitHub Secret):"
echo "=========================================="

# Build JSON manually to ensure proper format
JSON="{"
FIRST=true
for SERVICE_ID in "${!KEYS[@]}"; do
  if [ "$FIRST" = false ]; then
    JSON+=","
  fi
  JSON+="\"$SERVICE_ID\":\"${KEYS[$SERVICE_ID]}\""
  FIRST=false
done
JSON+="}"

echo "$JSON"

# Verify it's valid JSON
echo ""
echo "Verifying JSON..."
if echo "$JSON" | node -e "
  const fs = require('fs');
  try {
    JSON.parse(fs.readFileSync(0, 'utf-8'));
    console.log('✅ JSON is valid!');
    process.exit(0);
  } catch(e) {
    console.log('❌ JSON is invalid:', e.message);
    process.exit(1);
  }
"; then
  echo ""
  echo "=========================================="
  echo "📋 Base64 Encoded (alternative):"
  echo "=========================================="
  echo "$JSON" | base64 | tr -d '\n'
  echo ""
  echo ""
  echo "=========================================="
  echo "🚀 Next Steps:"
  echo "=========================================="
  echo "1. Copy the JSON format above (single line)"
  echo "2. Go to GitHub → Settings → Secrets → Actions"
  echo "3. Update or create 'API_KEYS' secret"
  echo "4. Paste the JSON (or use base64 version)"
  echo "5. Push to deploy"
  echo ""
  echo "=========================================="
  echo "🔐 Update Heartbeat Clients:"
  echo "=========================================="
  for SERVICE_ID in "${!KEYS[@]}"; do
    echo "$SERVICE_ID: ${KEYS[$SERVICE_ID]}"
  done
  echo "=========================================="
else
  echo "Failed to generate valid JSON!"
  exit 1
fi

