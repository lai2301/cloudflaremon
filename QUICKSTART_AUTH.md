# Quick Start: Shared Key Authentication

The simplest and most common setup for heartbeat authentication.

## 5-Minute Setup

### 1. Generate a Shared Key

```bash
openssl rand -base64 32
```

**Example output:**
```
xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q=
```

Copy this key - you'll need it in the next steps.

---

### 2. Configure in Cloudflare Worker

**For Development (wrangler.toml):**

Add this to your `wrangler.toml`:

```toml
[vars]
API_KEYS = '{"service-1":"xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q=","service-2":"xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q="}'
```

**For Production (Cloudflare Dashboard):**

1. Go to https://dash.cloudflare.com
2. Workers & Pages → `cloudflare-worker-monitor`
3. Settings → Variables → Edit variables
4. Add variable:
   - **Variable name:** `API_KEYS`
   - **Value:** `{"service-1":"YOUR_KEY_HERE","service-2":"YOUR_KEY_HERE"}`
   - Click "Save"
5. Redeploy if needed

**Alternative: Via Wrangler CLI (Most Secure):**

```bash
npx wrangler secret put API_KEYS
# When prompted, paste:
{"service-1":"xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q=","service-2":"xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q="}
```

---

### 3. Update Your Heartbeat Clients

**Python Example:**

```python
import requests

API_KEY = "xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q="

# Single service
requests.post(
    "https://mon.pipdor.com/api/heartbeat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"serviceId": "service-1"}
)

# Or batch mode
requests.post(
    "https://mon.pipdor.com/api/heartbeat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"services": ["service-1", "service-2"]}
)
```

**Bash Example:**

```bash
#!/bin/bash
API_KEY="xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q="

curl -X POST https://mon.pipdor.com/api/heartbeat \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "service-1"}'
```

---

### 4. Test It

```bash
# Test with correct key - should succeed
curl -X POST https://mon.pipdor.com/api/heartbeat \
  -H "Authorization: Bearer xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q=" \
  -d '{"serviceId": "service-1"}'

# Expected response:
# {"success":true,"message":"Heartbeat received","timestamp":"2024-01-15T..."}

# Test with wrong key - should fail
curl -X POST https://mon.pipdor.com/api/heartbeat \
  -H "Authorization: Bearer wrong-key" \
  -d '{"serviceId": "service-1"}'

# Expected response:
# {"success":false,"error":"Invalid API key"}
```

---

## Environment Variables

Store the key securely in your environment:

```bash
# In your .env or environment
export HEARTBEAT_API_KEY="xK9mP2nQ5vL8wR3tY6uA4zB7cD1eF0gH2iJ4kM6nP8q="

# Then use it in scripts
curl -H "Authorization: Bearer $HEARTBEAT_API_KEY" ...
```

---

## Common Issues

### ❌ "Invalid API key"
**Cause:** Key doesn't match or is missing Bearer prefix

**Fix:**
- Check the Authorization header: `Bearer YOUR_KEY`
- Verify API_KEYS environment variable matches
- No trailing spaces or newlines in the key

### ❌ "Server configuration error"
**Cause:** API_KEYS is not valid JSON

**Fix:**
- Ensure proper JSON format: `{"service-1":"key"}`
- Escape quotes if setting via command line
- Use a JSON validator

### ❌ Still not working?
**Debug steps:**
1. Check Worker logs in Cloudflare Dashboard
2. Verify API_KEYS is set in Environment Variables
3. Ensure you're using the same key in both places
4. Try redeploying the worker

---

## Security Tips

✅ **DO:**
- Use `wrangler secret` for production keys
- Store keys in environment variables
- Rotate keys periodically (every 90 days)
- Use different keys for dev/staging/prod

❌ **DON'T:**
- Commit keys to version control
- Share keys in plain text (use secret managers)
- Use the same key across different organizations
- Log keys or include them in error messages

---

## Per-Service Authentication Control 🆕

You can now enable/disable authentication per service or per group in `services.json`:

```json
{
  "groups": [
    {
      "id": "production",
      "services": ["prod-api"],
      "auth": {"required": true}
    },
    {
      "id": "development",
      "services": ["dev-api"],
      "auth": {"required": false}
    }
  ],
  "services": [
    {"id": "prod-api", "name": "Production API", "enabled": true},
    {"id": "dev-api", "name": "Development API", "enabled": true}
  ]
}
```

**Result:**
- `prod-api` requires authentication
- `dev-api` accepts heartbeats without authentication

**Benefits:**
- Mix authenticated and non-authenticated services
- No need to manage API keys for internal/dev services
- Service-level settings override group-level settings

See `docs/AUTH_CONFIGURATION.md` for complete details.

---

## Next Steps

- **Want no authentication?** Set `auth.required: false` in services.json or don't set API_KEYS
- **Need per-service keys?** See `docs/AUTHENTICATION.md`
- **Per-service auth control?** See `docs/AUTH_CONFIGURATION.md`
- **Setting up clients?** Check `examples/heartbeat-client.py`
- **Batch mode?** See `examples/BATCH_HEARTBEAT_EXAMPLES.md`

---

## Quick Reference

| Task | Command |
|------|---------|
| Generate key | `openssl rand -base64 32` |
| Set secret | `npx wrangler secret put API_KEYS` |
| Test heartbeat | `curl -H "Authorization: Bearer KEY" -d '{"serviceId":"s1"}' URL` |
| View logs | Cloudflare Dashboard → Workers → Logs |
| Update key | Set new value in API_KEYS, redeploy |

Done! Your heartbeat endpoint is now secured with a shared key. 🎉

