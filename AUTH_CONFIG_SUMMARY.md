# Your Current Auth Configuration

Based on your `services.json`, here's how authentication works for your services:

## Current Configuration

### Service 1 (Internal API)
- **Group:** Core Services
- **Auth Required:** ✅ Yes (from group setting)
- **API Key:** Must be set in `API_KEYS` environment variable

```bash
# Requires authentication
curl -H "Authorization: Bearer YOUR_KEY" \
  -d '{"serviceId": "service-1"}' \
  https://mon.pipdor.com/api/heartbeat
```

### Service 2 (Database Service)
- **Group:** Infrastructure
- **Auth Required:** ❌ No (from group setting)
- **API Key:** Not needed

```bash
# No authentication required
curl -d '{"serviceId": "service-2"}' \
  https://mon.pipdor.com/api/heartbeat
```

---

## How To Use

### Send Heartbeat for Service 1 (Auth Required)

```python
import requests

API_KEY = "your-key-for-service-1"

requests.post("https://mon.pipdor.com/api/heartbeat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"serviceId": "service-1"})
```

### Send Heartbeat for Service 2 (No Auth)

```python
import requests

# No API key needed!
requests.post("https://mon.pipdor.com/api/heartbeat",
    json={"serviceId": "service-2"})
```

### Batch Mode (Both Services)

```python
import requests

API_KEY = "your-key-for-service-1"

# Mix authenticated and non-authenticated services
requests.post("https://mon.pipdor.com/api/heartbeat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "services": [
            "service-1",  # Uses shared API key from header
            "service-2"   # No auth required, no key needed
        ]
    })
```

Or with per-service tokens:

```python
requests.post("https://mon.pipdor.com/api/heartbeat",
    json={
        "services": [
            {"serviceId": "service-1", "token": "key-for-service-1"},
            "service-2"  # No auth required
        ]
    })
```

---

## Changing Authentication Settings

### Make Both Services Require Auth

```json
{
  "groups": [
    {
      "id": "core-services",
      "services": ["service-1"],
      "auth": {"required": true}
    },
    {
      "id": "infrastructure",
      "services": ["service-2"],
      "auth": {"required": true}  // ← Change to true
    }
  ]
}
```

### Make Both Services Skip Auth

```json
{
  "groups": [
    {
      "id": "core-services",
      "services": ["service-1"],
      "auth": {"required": false}  // ← Change to false
    },
    {
      "id": "infrastructure",
      "services": ["service-2"],
      "auth": {"required": false}
    }
  ]
}
```

### Override at Service Level

```json
{
  "groups": [
    {
      "id": "core-services",
      "services": ["service-1"],
      "auth": {"required": false}  // ← Group says no auth
    }
  ],
  "services": [
    {
      "id": "service-1",
      "name": "Internal API",
      "enabled": true,
      "auth": {"required": true}  // ← But service overrides: requires auth!
    }
  ]
}
```

---

## Quick Setup

### Option 1: Keep Current Config (Mixed Auth)

**Service 1 needs auth:**
```bash
# Set API key for service-1
npx wrangler secret put API_KEYS
# Paste: {"service-1":"YOUR_KEY_HERE"}
```

**Service 2 needs no auth** - nothing to do!

### Option 2: Disable All Auth

Edit `services.json`:
```json
{
  "groups": [
    {
      "id": "core-services",
      "auth": {"required": false}
    },
    {
      "id": "infrastructure",
      "auth": {"required": false}
    }
  ]
}
```

Now both services accept heartbeats without authentication.

### Option 3: Enable All Auth

Edit `services.json`:
```json
{
  "groups": [
    {
      "id": "core-services",
      "auth": {"required": true}
    },
    {
      "id": "infrastructure",
      "auth": {"required": true}
    }
  ]
}
```

Set API keys:
```bash
npx wrangler secret put API_KEYS
# Paste: {"service-1":"KEY1","service-2":"KEY2"}
```

---

## Benefits of Your Setup

✅ **Production security** - service-1 requires authentication  
✅ **Internal convenience** - service-2 (database) doesn't need auth  
✅ **Flexible** - Can mix authenticated and non-authenticated services  
✅ **Easy batch heartbeats** - Send to both services in one request  

---

## Next Steps

1. **Set API key for service-1** (if not already done):
   ```bash
   openssl rand -base64 32  # Generate key
   npx wrangler secret put API_KEYS
   # Paste: {"service-1":"GENERATED_KEY"}
   ```

2. **Update your heartbeat clients** to use the configuration above

3. **Test it**:
   ```bash
   # Test service-1 (requires auth)
   curl -H "Authorization: Bearer YOUR_KEY" \
     -d '{"serviceId": "service-1"}' \
     https://mon.pipdor.com/api/heartbeat

   # Test service-2 (no auth)
   curl -d '{"serviceId": "service-2"}' \
     https://mon.pipdor.com/api/heartbeat
   ```

4. **See full documentation**:
   - `docs/AUTH_CONFIGURATION.md` - Complete auth guide
   - `QUICKSTART_AUTH.md` - Quick auth setup
   - `docs/AUTHENTICATION.md` - All authentication modes

---

## Summary

| Service | Group | Auth Required | Needs API Key |
|---------|-------|---------------|---------------|
| service-1 (Internal API) | Core Services | ✅ Yes | Yes |
| service-2 (Database Service) | Infrastructure | ❌ No | No |

Your configuration is **ready to use** with mixed authentication! 🎉

