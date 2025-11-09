#!/bin/bash

# Cloudflare Worker Heartbeat Client (Bash)
# This script sends heartbeats to the Cloudflare Worker
# Supports both single and batch (multiple services) modes
# Run this periodically using cron or a system timer

# Configuration
WORKER_URL="https://mon.pipdor.com/api/heartbeat"

# Single service mode
SERVICE_ID="service-1"
API_KEY="your-secret-key-1"

# Batch mode - set to "true" to enable
BATCH_MODE="false"
# Multiple services for batch mode (space-separated)
BATCH_SERVICES=("service-1" "service-2" "service-3")

# Function to send single heartbeat
send_single_heartbeat() {
  echo "Sending heartbeat for service: $SERVICE_ID..."
  
  # Build JSON payload for single service
  JSON_PAYLOAD=$(cat <<EOF
{
  "serviceId": "$SERVICE_ID"
}
EOF
)

  # Send heartbeat
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$JSON_PAYLOAD")
  
  # Split response body and status code
  HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  
  # Check response
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date)] ✓ Heartbeat sent successfully"
    exit 0
  else
    echo "[$(date)] ✗ Failed (HTTP $HTTP_CODE): $HTTP_BODY"
    exit 1
  fi
}

# Function to send batch heartbeat
send_batch_heartbeat() {
  echo "Sending batch heartbeat for ${#BATCH_SERVICES[@]} services..."
  
  # Build JSON array of service IDs
  SERVICES_JSON="["
  for i in "${!BATCH_SERVICES[@]}"; do
    if [ $i -gt 0 ]; then
      SERVICES_JSON+=","
    fi
    SERVICES_JSON+="\"${BATCH_SERVICES[$i]}\""
  done
  SERVICES_JSON+="]"
  
  # Build JSON payload for batch
  JSON_PAYLOAD=$(cat <<EOF
{
  "services": $SERVICES_JSON
}
EOF
)

  # Send batch heartbeat
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$JSON_PAYLOAD")
  
  # Split response body and status code
  HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  
  # Check response
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date)] ✓ Batch heartbeat sent successfully"
    echo "$HTTP_BODY" | grep -o '"message":"[^"]*"' | sed 's/"message":"\(.*\)"/  \1/'
    exit 0
  elif [ "$HTTP_CODE" = "207" ]; then
    echo "[$(date)] ⚠ Partial success"
    echo "$HTTP_BODY"
    exit 0
  else
    echo "[$(date)] ✗ Batch failed (HTTP $HTTP_CODE): $HTTP_BODY"
    exit 1
  fi
}

# Main execution
if [ "$BATCH_MODE" = "true" ]; then
  send_batch_heartbeat
else
  send_single_heartbeat
fi

