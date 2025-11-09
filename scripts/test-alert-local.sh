#!/bin/bash

# Test Alert Notifications Locally
# This script sends test alerts to your local development server

LOCAL_URL="http://localhost:53403"

echo "🧪 Testing Alert Notifications Locally"
echo "========================================"
echo ""

# Test 1: Critical Alert
echo "1️⃣  Sending CRITICAL alert..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical: Service Down",
    "message": "Production API is not responding",
    "severity": "critical",
    "source": "test-script"
  }'
echo -e "\n"

sleep 2

# Test 2: Warning Alert
echo "2️⃣  Sending WARNING alert..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Warning: High CPU Usage",
    "message": "CPU usage at 85% for the last 5 minutes",
    "severity": "warning",
    "source": "monitoring"
  }'
echo -e "\n"

sleep 2

# Test 3: Info Alert
echo "3️⃣  Sending INFO alert..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment Complete",
    "message": "Version 2.1.0 successfully deployed to production",
    "severity": "info",
    "source": "ci-cd"
  }'
echo -e "\n"

sleep 2

# Test 4: Check recent alerts
echo "4️⃣  Fetching recent alerts..."
curl -s "$LOCAL_URL/api/alerts/recent?limit=5" | json_pp 2>/dev/null || curl "$LOCAL_URL/api/alerts/recent?limit=5"
echo -e "\n"

echo ""
echo "✅ Test complete!"
echo ""
echo "📱 Open your dashboard at: $LOCAL_URL"
echo "   Watch for toast notifications to appear!"
echo ""

