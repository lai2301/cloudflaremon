#!/bin/bash

# Test Notification Script
# This script tests your notification configuration by sending a test alert

# Configuration
WORKER_URL="https://your-worker.workers.dev"
CHANNEL_TYPE="discord"  # discord, slack, telegram, email, webhook, pushover, pagerduty
EVENT_TYPE="down"       # down, up, degraded

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔔 Testing Notification System"
echo "================================"
echo "Worker URL: $WORKER_URL"
echo "Channel Type: $CHANNEL_TYPE"
echo "Event Type: $EVENT_TYPE"
echo ""

# Send test notification
response=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/api/test-notification" \
  -H "Content-Type: application/json" \
  -d "{\"channelType\":\"$CHANNEL_TYPE\",\"eventType\":\"$EVENT_TYPE\"}")

# Extract HTTP status code and body
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

# Parse response
success=$(echo "$body" | grep -o '"success":[^,}]*' | cut -d':' -f2)
message=$(echo "$body" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ "$http_code" = "200" ] && [ "$success" = "true" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  echo -e "Message: $message"
  echo ""
  echo "Check your notification channel to confirm receipt!"
else
  echo -e "${RED}❌ Failed${NC}"
  echo -e "HTTP Status: $http_code"
  echo -e "Message: $message"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check notifications.json - is the channel enabled?"
  echo "2. Verify your webhook URL / API credentials"
  echo "3. Check worker logs: npm run tail"
fi

