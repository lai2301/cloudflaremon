#!/bin/bash

# Test All Notification Types - Local Development
# This script tests both external alerts and service status changes

LOCAL_URL="http://localhost:53403"

echo "🧪 Testing Complete Alert Notification System"
echo "=============================================="
echo ""

# Test 1: External Alert - Critical
echo "1️⃣  Testing External Alert (Critical)..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical: Database Connection Lost",
    "message": "Unable to connect to primary database server",
    "severity": "critical",
    "source": "database-monitor"
  }'
echo -e "\n"
sleep 2

# Test 2: External Alert - Warning
echo "2️⃣  Testing External Alert (Warning)..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Warning: High Memory Usage",
    "message": "Memory usage at 85% for the last 10 minutes",
    "severity": "warning",
    "source": "system-monitor"
  }'
echo -e "\n"
sleep 2

# Test 3: External Alert - Info
echo "3️⃣  Testing External Alert (Info)..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment Successful",
    "message": "Version 3.2.1 deployed to production",
    "severity": "info",
    "source": "ci-cd-pipeline"
  }'
echo -e "\n"
sleep 2

# Test 4: Grafana Alert Format
echo "4️⃣  Testing Grafana Alert Format..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CPU Alert",
    "state": "alerting",
    "message": "CPU usage above 90% threshold",
    "ruleName": "High CPU Alert",
    "ruleUrl": "https://grafana.example.com/alerts/1"
  }'
echo -e "\n"
sleep 2

# Test 5: Alertmanager Format
echo "5️⃣  Testing Alertmanager Format..."
curl -X POST "$LOCAL_URL/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighDiskUsage",
        "severity": "warning",
        "instance": "server-01"
      },
      "annotations": {
        "summary": "Disk usage critical",
        "description": "Disk usage at 95% on server-01"
      }
    }]
  }'
echo -e "\n"
sleep 2

# Test 6: Check Recent Alerts
echo "6️⃣  Checking Recent Alerts..."
echo "GET $LOCAL_URL/api/alerts/recent?limit=10"
curl -s "$LOCAL_URL/api/alerts/recent?limit=10" | python3 -m json.tool 2>/dev/null || curl "$LOCAL_URL/api/alerts/recent?limit=10"
echo -e "\n"

# Test 7: Simulate Service Going Down (if services are configured)
echo "7️⃣  Service Status Change Test..."
echo "   Note: Service status change alerts will appear when:"
echo "   - A service stops sending heartbeats (goes down)"
echo "   - A service resumes sending heartbeats (comes back up)"
echo "   - This requires actual service heartbeat data"
echo ""

# Test 8: Send Test Heartbeat
echo "8️⃣  Sending Test Heartbeat (to establish service as 'up')..."
curl -X POST "$LOCAL_URL/api/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service-1"
  }'
echo -e "\n"
sleep 2

echo ""
echo "✅ Test Complete!"
echo ""
echo "📱 Dashboard Notifications Include:"
echo "   ✓ External alerts from /api/alert"
echo "   ✓ Service status changes (down/up/degraded)"
echo "   ✓ Grafana webhook alerts"
echo "   ✓ Alertmanager webhook alerts"
echo ""
echo "🌐 Open dashboard at: $LOCAL_URL"
echo "   Watch for toast notifications within 10 seconds!"
echo ""
echo "📊 Notification Types You Should See:"
echo "   🚨 Critical: Red border"
echo "   ⚠️  Warning: Yellow border"
echo "   ℹ️  Info: Blue border"
echo ""
echo "💡 To trigger service status change alerts:"
echo "   1. Send heartbeats regularly to establish 'up' status"
echo "   2. Stop sending heartbeats (service goes 'down')"
echo "   3. Watch for 'Service Down' alert on dashboard"
echo "   4. Resume heartbeats (service goes 'up')"
echo "   5. Watch for 'Service Recovered' alert"
echo ""

