#!/usr/bin/env python3
"""
Test script for external alert endpoint
Usage: python test-external-alert.py [worker-url] [api-key]
Example: python test-external-alert.py https://your-worker.workers.dev my-secret-key
"""

import sys
import json
import requests
from datetime import datetime

WORKER_URL = sys.argv[1] if len(sys.argv) > 1 else "https://your-worker.workers.dev"
API_KEY = sys.argv[2] if len(sys.argv) > 2 else None
ENDPOINT = f"{WORKER_URL}/api/alert"

def send_alert(name, payload):
    """Send alert and print results"""
    print(f"\n📝 {name}")
    print("-" * 40)
    
    try:
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        
        response = requests.post(
            ENDPOINT,
            headers=headers,
            json=payload,
            timeout=10
        )
        
        result = response.json()
        print(json.dumps(result, indent=2))
        
        if response.status_code == 200:
            print("✅ Success")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON response: {response.text}")

def main():
    if API_KEY:
        print("🔐 Using API Key authentication")
    else:
        print("⚠️  No API Key provided (endpoint must be public)")
    
    print("🧪 Testing External Alert Integration")
    print(f"Endpoint: {ENDPOINT}\n")
    
    # Test 1: Generic format alert
    send_alert(
        "Test 1: Generic Format (Warning)",
        {
            "title": "Test Generic Alert",
            "message": "This is a test alert using the generic format",
            "severity": "warning",
            "source": "test-script",
            "labels": {
                "environment": "test",
                "script": "test-external-alert.py"
            }
        }
    )
    
    # Test 2: Critical severity
    send_alert(
        "Test 2: Critical Severity",
        {
            "title": "Critical System Alert",
            "message": "A critical issue has been detected",
            "severity": "critical",
            "source": "test-script"
        }
    )
    
    # Test 3: Alertmanager format (single firing alert)
    send_alert(
        "Test 3: Alertmanager Format (Firing)",
        {
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
        }
    )
    
    # Test 4: Alertmanager format (resolved)
    send_alert(
        "Test 4: Alertmanager Format (Resolved)",
        {
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
        }
    )
    
    # Test 5: Alertmanager format (multiple alerts)
    send_alert(
        "Test 5: Alertmanager Format (Multiple Alerts)",
        {
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
        }
    )
    
    # Test 6: Grafana format
    send_alert(
        "Test 6: Grafana Format",
        {
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
        }
    )
    
    # Test 7: Info severity
    send_alert(
        "Test 7: Info Severity",
        {
            "title": "Deployment Completed",
            "message": "New version v2.5.0 deployed successfully",
            "severity": "info",
            "source": "ci-cd",
            "labels": {
                "version": "v2.5.0",
                "environment": "production"
            }
        }
    )
    
    # Test 8: Specific channels routing
    send_alert(
        "Test 8: Specific Channels (Discord + Slack only)",
        {
            "title": "Channel Routing Test",
            "message": "This alert should only go to Discord and Slack",
            "severity": "warning",
            "source": "test-script",
            "channels": ["discord", "slack"]
        }
    )
    
    # Test 9: Single channel routing
    send_alert(
        "Test 9: Single Channel (PagerDuty only)",
        {
            "title": "Critical Production Issue",
            "message": "This alert should only trigger PagerDuty",
            "severity": "critical",
            "source": "test-script",
            "channels": ["pagerduty"]
        }
    )
    
    print("\n\n✅ All tests completed!\n")
    print("📌 Check your notification channels (Discord, Slack, etc.) to verify alerts were received.")
    print("📌 Tests 8 and 9 demonstrate channel-specific routing.")

if __name__ == "__main__":
    main()

