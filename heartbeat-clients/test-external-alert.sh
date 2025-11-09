#!/bin/bash

# Test script for external alert endpoint
# Usage: ./test-external-alert.sh [worker-url] [api-key]
# Example: ./test-external-alert.sh https://your-worker.workers.dev my-secret-key

WORKER_URL="${1:-https://your-worker.workers.dev}"
API_KEY="${2:-}"
ENDPOINT="$WORKER_URL/api/alert"

# Helper function to make curl requests with optional auth
make_request() {
  local payload="$1"
  if [ -n "$API_KEY" ]; then
    curl -X POST "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $API_KEY" \
      -d "$payload" | jq .
  else
    curl -X POST "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "$payload" | jq .
  fi
}

if [ -n "$API_KEY" ]; then
  echo "🔐 Using API Key authentication"
else
  echo "⚠️  No API Key provided (endpoint must be public)"
fi

echo "🧪 Testing External Alert Integration"
echo "Endpoint: $ENDPOINT"
echo ""

# Test 1: Generic format alert
echo "📝 Test 1: Generic Format (Warning)"
echo "----------------------------------------"
make_request '{
    "title": "Test Generic Alert",
    "message": "This is a test alert using the generic format",
    "severity": "warning",
    "source": "test-script",
    "labels": {
      "environment": "test",
      "script": "test-external-alert.sh"
    }
  }'

echo ""
echo ""

# Test 2: Critical severity
echo "📝 Test 2: Critical Severity"
echo "----------------------------------------"
make_request '{
    "title": "Critical System Alert",
    "message": "A critical issue has been detected",
    "severity": "critical",
    "source": "test-script"
  }'

echo ""
echo ""

# Test 3: Alertmanager format (single firing alert)
echo "📝 Test 3: Alertmanager Format (Firing)"
echo "----------------------------------------"
make_request '{
    "receiver": "cloudflare-monitor",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighCPU",
        "severity": "warning",
        "instance": "server-01",
        "job": "node-exporter"
      },
      "annotations": {
        "summary": "High CPU usage detected",
        "description": "CPU usage is above 80% on server-01"
      },
      "startsAt": "2025-11-06T10:30:00Z",
      "generatorURL": "http://prometheus:9090/graph"
    }],
    "groupLabels": {
      "alertname": "HighCPU"
    }
  }'

echo ""
echo ""

# Test 4: Alertmanager format (resolved)
echo "📝 Test 4: Alertmanager Format (Resolved)"
echo "----------------------------------------"
make_request '{
    "receiver": "cloudflare-monitor",
    "status": "resolved",
    "alerts": [{
      "status": "resolved",
      "labels": {
        "alertname": "HighCPU",
        "severity": "warning",
        "instance": "server-01"
      },
      "annotations": {
        "summary": "High CPU usage detected",
        "description": "CPU usage has returned to normal"
      },
      "startsAt": "2025-11-06T10:30:00Z",
      "endsAt": "2025-11-06T10:45:00Z"
    }]
  }'

echo ""
echo ""

# Test 5: Alertmanager format (multiple alerts)
echo "📝 Test 5: Alertmanager Format (Multiple Alerts)"
echo "----------------------------------------"
make_request '{
    "receiver": "cloudflare-monitor",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighMemory",
          "severity": "critical",
          "instance": "server-01"
        },
        "annotations": {
          "summary": "Memory usage critical",
          "description": "Memory usage is above 95%"
        }
      },
      {
        "status": "firing",
        "labels": {
          "alertname": "HighMemory",
          "severity": "critical",
          "instance": "server-02"
        },
        "annotations": {
          "summary": "Memory usage critical",
          "description": "Memory usage is above 95%"
        }
      },
      {
        "status": "resolved",
        "labels": {
          "alertname": "HighMemory",
          "severity": "critical",
          "instance": "server-03"
        },
        "annotations": {
          "summary": "Memory usage critical",
        "description": "Memory usage returned to normal"
      }
    }
    ]
  }'

echo ""
echo ""

# Test 6: Grafana format
echo "📝 Test 6: Grafana Format"
echo "----------------------------------------"
make_request '{
    "dashboardId": 1,
    "evalMatches": [{
      "value": 95.5,
      "metric": "memory_usage_percent",
      "tags": {
        "host": "web-server-01"
      }
    }],
    "message": "Memory usage is critically high",
    "orgId": 1,
    "panelId": 2,
    "ruleId": 1,
    "ruleName": "High Memory Alert",
    "ruleUrl": "https://grafana.example.com/alerting/1",
    "state": "alerting",
    "tags": {
      "severity": "critical"
    },
    "title": "High Memory Usage on web-server-01"
  }'

echo ""
echo ""

# Test 7: Info severity
echo "📝 Test 7: Info Severity"
echo "----------------------------------------"
make_request '{
    "title": "Deployment Completed",
    "message": "New version v2.5.0 deployed successfully",
    "severity": "info",
    "source": "ci-cd",
    "labels": {
      "version": "v2.5.0",
      "environment": "production"
    }
  }'

echo ""
echo ""

# Test 8: Specific channels routing
echo "📝 Test 8: Specific Channels (Discord + Slack only)"
echo "----------------------------------------"
make_request '{
    "title": "Channel Routing Test",
    "message": "This alert should only go to Discord and Slack",
    "severity": "warning",
    "source": "test-script",
    "channels": ["discord", "slack"]
  }'

echo ""
echo ""

# Test 9: Single channel routing
echo "📝 Test 9: Single Channel (PagerDuty only)"
echo "----------------------------------------"
make_request '{
    "title": "Critical Production Issue",
    "message": "This alert should only trigger PagerDuty",
    "severity": "critical",
    "source": "test-script",
    "channels": ["pagerduty"]
  }'

echo ""
echo ""
echo "✅ All tests completed!"
echo ""
echo "📌 Check your notification channels (Discord, Slack, etc.) to verify alerts were received."
echo "📌 Tests 8 and 9 demonstrate channel-specific routing."

