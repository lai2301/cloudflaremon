#!/usr/bin/env python3
"""
Cloudflare Worker Heartbeat Client (Python)
This script sends a heartbeat to the Cloudflare Worker
Run this periodically using cron, systemd timer, or a scheduler
"""

import requests
import socket
import json
import sys
from datetime import datetime

# Configuration
WORKER_URL = "https://heartbeat-monitor.your-subdomain.workers.dev/api/heartbeat"
SERVICE_ID = "service-1"
API_KEY = "your-secret-key-1"

def send_heartbeat():
    """Send heartbeat to Cloudflare Worker"""
    
    # Gather metadata
    hostname = socket.gethostname()
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Build payload
    payload = {
        "serviceId": SERVICE_ID,
        "status": "up",
        "metadata": {
            "hostname": hostname,
            "timestamp": timestamp,
        },
        "message": f"Heartbeat from {hostname}"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    try:
        # Send heartbeat
        response = requests.post(
            WORKER_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            print(f"[{datetime.now()}] Heartbeat sent successfully: {result.get('message')}")
            return 0
        else:
            print(f"[{datetime.now()}] Failed to send heartbeat: {response.status_code} - {response.text}")
            return 1
            
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] Error sending heartbeat: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(send_heartbeat())

