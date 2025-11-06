#!/usr/bin/env python3
"""
Generate API Keys for GitHub Secrets
This ensures the JSON is properly formatted and valid
"""

import json
import subprocess
import sys
import base64

def generate_key():
    """Generate a secure random key"""
    result = subprocess.run(
        ['openssl', 'rand', '-base64', '32'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def main():
    print("🔑 Generating API Keys for GitHub Secrets")
    print("=" * 50)
    print()
    
    # Load services from services.json
    try:
        with open('services.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        print("❌ Error: services.json not found!")
        print("   Make sure you're running this from the project root")
        sys.exit(1)
    
    services = config.get('services', [])
    if not services:
        print("❌ No services found in services.json!")
        sys.exit(1)
    
    # Generate keys for each service
    api_keys = {}
    print("Generating keys for services:")
    for service in services:
        service_id = service['id']
        key = generate_key()
        api_keys[service_id] = key
        print(f"✅ Generated key for: {service_id}")
    
    print()
    print("=" * 50)
    print("📋 JSON Format (for GitHub Secret):")
    print("=" * 50)
    
    # Create properly formatted JSON (single line, no spaces)
    json_string = json.dumps(api_keys, separators=(',', ':'))
    print(json_string)
    
    # Verify it's valid
    print()
    print("Verifying JSON...")
    try:
        json.loads(json_string)
        print("✅ JSON is valid!")
    except json.JSONDecodeError as e:
        print(f"❌ JSON is invalid: {e}")
        sys.exit(1)
    
    # Provide base64 alternative
    print()
    print("=" * 50)
    print("📋 Base64 Encoded (alternative):")
    print("=" * 50)
    base64_string = base64.b64encode(json_string.encode()).decode()
    print(base64_string)
    
    print()
    print()
    print("=" * 50)
    print("🚀 Next Steps:")
    print("=" * 50)
    print("1. Copy the JSON format above (single line)")
    print("2. Go to GitHub → Settings → Secrets → Actions")
    print("3. Update or create 'API_KEYS' secret")
    print("4. Paste the JSON")
    print("   OR use base64 version (workflow will auto-decode)")
    print("5. Commit and push to deploy")
    print()
    print("=" * 50)
    print("🔐 Update Heartbeat Clients:")
    print("=" * 50)
    for service_id, key in api_keys.items():
        print(f"{service_id}: {key}")
    print("=" * 50)
    
    # Save to file for reference
    with open('.api_keys_generated.txt', 'w') as f:
        f.write("JSON Format:\n")
        f.write(json_string + "\n\n")
        f.write("Base64 Format:\n")
        f.write(base64_string + "\n\n")
        f.write("Individual Keys:\n")
        for service_id, key in api_keys.items():
            f.write(f"{service_id}: {key}\n")
    
    print()
    print("💾 Keys also saved to: .api_keys_generated.txt")
    print("   (This file is git-ignored)")

if __name__ == '__main__':
    main()

