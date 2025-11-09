#!/usr/bin/env python3
"""
Test Notification Script
This script tests your notification configuration by sending a test alert
"""

import requests
import json
import sys

# Configuration
WORKER_URL = "https://your-worker.workers.dev"
CHANNEL_TYPE = "discord"  # discord, slack, telegram, email, webhook, pushover, pagerduty
EVENT_TYPE = "down"       # down, up, degraded

# Colors for output
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

def test_notification():
    print("🔔 Testing Notification System")
    print("=" * 40)
    print(f"Worker URL: {WORKER_URL}")
    print(f"Channel Type: {CHANNEL_TYPE}")
    print(f"Event Type: {EVENT_TYPE}")
    print()

    try:
        # Send test notification
        response = requests.post(
            f"{WORKER_URL}/api/test-notification",
            headers={'Content-Type': 'application/json'},
            json={
                'channelType': CHANNEL_TYPE,
                'eventType': EVENT_TYPE
            },
            timeout=10
        )

        # Parse response
        data = response.json()
        
        if response.status_code == 200 and data.get('success'):
            print(f"{GREEN}✅ Success!{NC}")
            print(f"Message: {data.get('message')}")
            print()
            print("Check your notification channel to confirm receipt!")
            return 0
        else:
            print(f"{RED}❌ Failed{NC}")
            print(f"HTTP Status: {response.status_code}")
            print(f"Message: {data.get('message', 'Unknown error')}")
            print()
            print("Troubleshooting:")
            print("1. Check notifications.json - is the channel enabled?")
            print("2. Verify your webhook URL / API credentials")
            print("3. Check worker logs: npm run tail")
            return 1

    except requests.exceptions.Timeout:
        print(f"{RED}❌ Request timed out{NC}")
        print("The worker did not respond in time.")
        return 1
    except requests.exceptions.RequestException as e:
        print(f"{RED}❌ Connection error{NC}")
        print(f"Error: {str(e)}")
        return 1
    except json.JSONDecodeError:
        print(f"{RED}❌ Invalid JSON response{NC}")
        print(f"Response: {response.text}")
        return 1

if __name__ == "__main__":
    sys.exit(test_notification())

