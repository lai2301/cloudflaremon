#!/usr/bin/env python3
# --------------------------------------------------------------------- 
# 
# # RUNNING NOTES 
# 
# 
# Where to run 
# - Run this script from the project root directory: 
#     ~/projects/cloudflaremon_lite/slim 
# 
# Why run from the project root 
# - The script expects relative paths (venv, agent/ files) and uses the 
# project's virtual environment. Running from the project root avoids 
# path errors and ensures imports and file references resolve. 
# 
# Pre-run steps (one-time per shell/session) 
# 1. Change to the project root (required): 
#     cd ~/projects/cloudflaremon_lite/slim 
# 
# 2. Activate the virtual environment (required if you created one): 
# source venv/bin/activate 
# 
# 3. Export runtime environment variables (recommended; do NOT commit): 
# export WORKER_URL="http://127.0.0.1:8787/api/heartbeat" 
# export SERVICE_ID="raspi4-8g" 
# export HEARTBEAT_SECRET="your-secret-here" 
# export NO_PROXY="127.0.0.1,localhost" 
# 
# Running the script 
# - Dry run (prints payload and headers, no network call): 
#     python agent/heartbeat-client.py --dry-run --verbose 
# 
# - Real run (sends heartbeat to WORKER_URL): 
#     python agent/heartbeat-client.py --verbose 
# 
# Notes about editing and placement 
# - Place this comment block at the top of the file, after the shebang 
# and any module docstring. Keep a single blank line above and below. 
# - Do not store secrets in the file. Use environment variables or a 
# secure host-level secret store (systemd EnvironmentFile, keyring). 
# 
# Troubleshooting quick checks 
# - If the script hits Cloudflare's public page, confirm WORKER_URL is 
# set to the local dev URL and that HTTP(S)_PROXY is unset: 
#   env | grep -i proxy 
#   unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy 
# ---------------------------------------------------------------------
"""
Cloudflare Worker Heartbeat Client (Python)
This script sends heartbeats to the Cloudflare Worker
Supports both single and batch (multiple services) modes
Run this periodically using cron, systemd timer, or a scheduler
"""

import requests
import socket
import json
import sys
from datetime import datetime

# Configuration
WORKER_URL = "http://worker.url/here"

# Single service mode
SERVICE_ID = "service-1"
API_KEY = "your-secret-key-1"

# Batch mode - multiple services
BATCH_MODE = False  # Set to True to enable batch mode

# Option 1: Shared API key (all services use the same key)
BATCH_SHARED_KEY = True
SERVICE_IDS = ["service-1", "service-2", "service-3"]

# Option 2: Per-service API keys (each service has its own key)
# Set BATCH_SHARED_KEY = False to use this mode
SERVICES_WITH_KEYS = [
    {"serviceId": "service-1", "token": "key-for-service-1"},
    {"serviceId": "service-2", "token": "key-for-service-2"},
    {"serviceId": "service-3", "token": "key-for-service-3"},
]

def send_heartbeat_single():
    """Send heartbeat for a single service"""
    
    # Build payload for single service
    payload = {
        "serviceId": SERVICE_ID
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    try:
        response = requests.post(
            WORKER_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[{datetime.now()}] ✓ Heartbeat sent: {result.get('message')}")
            return 0
        else:
            print(f"[{datetime.now()}] ✗ Failed: {response.status_code} - {response.text}")
            return 1
            
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] ✗ Error: {e}")
        return 1

def send_heartbeat_batch():
    """Send heartbeats for multiple services in a single request"""
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Build payload based on authentication mode
    if BATCH_SHARED_KEY:
        # Option 1: Shared API key for all services
        payload = {
            "services": SERVICE_IDS
        }
        headers["Authorization"] = f"Bearer {API_KEY}"
        print(f"Using shared API key for {len(SERVICE_IDS)} services...")
    else:
        # Option 2: Per-service API keys
        payload = {
            "services": SERVICES_WITH_KEYS
        }
        print(f"Using per-service API keys for {len(SERVICES_WITH_KEYS)} services...")
    
    try:
        response = requests.post(
            WORKER_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Handle different response statuses
        if response.status_code == 200:
            # All succeeded
            result = response.json()
            print(f"[{datetime.now()}] ✓ Batch heartbeat sent: {result.get('message')}")
            if result.get('results'):
                for service_result in result['results']:
                    status = "✓" if service_result['success'] else "✗"
                    print(f"  {status} {service_result['serviceId']}")
            return 0
        elif response.status_code == 207:
            # Partial success
            result = response.json()
            print(f"[{datetime.now()}] ⚠ Partial success: {result.get('message')}")
            for service_result in result.get('results', []):
                if service_result['success']:
                    print(f"  ✓ {service_result['serviceId']}")
                else:
                    print(f"  ✗ {service_result['serviceId']}: {service_result.get('error')}")
            return 0
        else:
            # All failed
            print(f"[{datetime.now()}] ✗ Batch failed: {response.status_code} - {response.text}")
            return 1
            
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] ✗ Error: {e}")
        return 1

def main():
    """Main entry point"""
    if BATCH_MODE:
        count = len(SERVICE_IDS) if BATCH_SHARED_KEY else len(SERVICES_WITH_KEYS)
        mode = "shared key" if BATCH_SHARED_KEY else "per-service keys"
        print(f"Sending batch heartbeat for {count} services ({mode})...")
        return send_heartbeat_batch()
    else:
        print(f"Sending heartbeat for service: {SERVICE_ID}...")
        return send_heartbeat_single()

if __name__ == "__main__":
    sys.exit(main())

