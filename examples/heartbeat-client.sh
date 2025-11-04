#!/bin/bash

# Cloudflare Worker Heartbeat Client (Bash)
# This script sends a heartbeat to the Cloudflare Worker
# Run this periodically using cron or a system timer

# Configuration
WORKER_URL="https://heartbeat-monitor.your-subdomain.workers.dev/api/heartbeat"
SERVICE_ID="service-1"
API_KEY="your-secret-key-1"

# Optional metadata (can be expanded with additional system info)
HOSTNAME=$(hostname)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "serviceId": "$SERVICE_ID",
  "status": "up",
  "metadata": {
    "hostname": "$HOSTNAME",
    "timestamp": "$TIMESTAMP"
  },
  "message": "Heartbeat from $HOSTNAME"
}
EOF
)

# Send heartbeat
RESPONSE=$(curl -s -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$JSON_PAYLOAD")

# Check response
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "[$(date)] Heartbeat sent successfully"
  exit 0
else
  echo "[$(date)] Failed to send heartbeat: $RESPONSE"
  exit 1
fi

