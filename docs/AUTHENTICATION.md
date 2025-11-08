# Authentication Guide

This guide explains how API key authentication works in the Cloudflare Worker Monitor, especially for batch heartbeat requests.

## Overview

The `/api/heartbeat` endpoint supports flexible authentication to accommodate different deployment scenarios:

1. **Single service with header token** - Traditional API key in Authorization header
2. **Batch with shared token** - Multiple services using the same API key
3. **Batch with per-service tokens** - Multiple services with different API keys
4. **Hybrid mode** - Mix of shared and per-service tokens

---

## How Authentication Works

### 1. API Keys Configuration

API keys are configured in your Cloudflare Worker's environment variable `API_KEYS`:

```json
{
  "service-1": "secret-key-for-service-1",
  "service-2": "secret-key-for-service-2",
  "service-3": "secret-key-for-service-3"
}
```

Set this in `wrangler.toml` (for development):
```toml
[vars]
API_KEYS = '{"service-1":"key1","service-2":"key2"}'
```

Or via Cloudflare Dashboard → Workers → Settings → Environment Variables → Edit variables (for production)

### 2. Authentication Flow

When a heartbeat request arrives:

```
1. Parse the request payload
2. For each service:
   a. Check if service exists in configuration
   b. If service has an API key configured in API_KEYS:
      - Look for per-service token in payload
      - If not found, use Authorization header
      - Validate token matches expected key
   c. If valid, mark service as authenticated
3. Update only authenticated services
4. Return results with success/failure per service
```

---

## Authentication Modes

### Mode 1: Single Service (Header Token)

**When to use:** Sending heartbeat for one service

**Request:**
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer secret-key-for-service-1" \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "service-1"}'
```

**Authentication:**
- Uses `Authorization` header
- Validates against `API_KEYS["service-1"]`

**Response (200):**
```json
{
  "success": true,
  "message": "Heartbeat received",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Mode 2: Batch with Shared Token

**When to use:** Multiple services sharing the same API key

**Example scenario:** All services in a Kubernetes namespace share a namespace-level secret

**Request:**
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer shared-namespace-key" \
  -H "Content-Type: application/json" \
  -d '{
    "services": ["ns-frontend", "ns-backend", "ns-cache"]
  }'
```

**Authentication:**
- All services use `Authorization` header
- Each service validates against its own key in `API_KEYS`
- Services with matching keys succeed
- Services with non-matching keys fail

**API_KEYS configuration:**
```json
{
  "ns-frontend": "shared-namespace-key",
  "ns-backend": "shared-namespace-key",
  "ns-cache": "shared-namespace-key"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Batch heartbeat received for 3 service(s)",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {"serviceId": "ns-frontend", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "ns-backend", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "ns-cache", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"}
  ]
}
```

---

### Mode 3: Batch with Per-Service Tokens

**When to use:** Multiple services with different API keys in a single request

**Example scenario:** Multi-tenant monitoring agent managing services from different customers

**Request:**
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      {"serviceId": "customer-a-web", "token": "key-for-customer-a"},
      {"serviceId": "customer-a-api", "token": "key-for-customer-a"},
      {"serviceId": "customer-b-web", "token": "key-for-customer-b"},
      {"serviceId": "customer-b-db", "token": "key-for-customer-b"}
    ]
  }'
```

**Authentication:**
- Each service provides its own token in the payload
- No Authorization header needed (optional)
- Each service validates against its configured key

**API_KEYS configuration:**
```json
{
  "customer-a-web": "key-for-customer-a",
  "customer-a-api": "key-for-customer-a",
  "customer-b-web": "key-for-customer-b",
  "customer-b-db": "key-for-customer-b"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Batch heartbeat received for 4 service(s)",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {"serviceId": "customer-a-web", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "customer-a-api", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "customer-b-web", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "customer-b-db", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"}
  ]
}
```

---

### Mode 4: Hybrid (Mixed Authentication)

**When to use:** Most services share a key, but some need special keys

**Example scenario:** Development environment where most services use a default key, but production database requires a special key

**Request:**
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer default-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      "dev-frontend",
      "dev-backend",
      "dev-cache",
      {"serviceId": "prod-critical-db", "token": "ultra-secure-prod-key"}
    ]
  }'
```

**Authentication:**
- String format services ("dev-frontend") use Authorization header
- Object format services use their own token
- Per-service tokens override the header

**API_KEYS configuration:**
```json
{
  "dev-frontend": "default-dev-key",
  "dev-backend": "default-dev-key",
  "dev-cache": "default-dev-key",
  "prod-critical-db": "ultra-secure-prod-key"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Batch heartbeat received for 4 service(s)",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {"serviceId": "dev-frontend", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "dev-backend", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "dev-cache", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "prod-critical-db", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"}
  ]
}
```

---

## Partial Success Handling

When some services authenticate successfully and others fail, the endpoint returns HTTP 207 (Multi-Status):

**Request:**
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer correct-key" \
  -d '{
    "services": [
      "service-with-correct-key",
      {"serviceId": "service-with-wrong-key", "token": "incorrect-key"},
      "unknown-service"
    ]
  }'
```

**Response (207 Multi-Status):**
```json
{
  "success": true,
  "message": "Partial success: 1 succeeded, 2 failed",
  "results": [
    {"serviceId": "service-with-correct-key", "success": true, "timestamp": "2024-01-15T10:30:00.000Z"},
    {"serviceId": "service-with-wrong-key", "success": false, "error": "Invalid API key"},
    {"serviceId": "unknown-service", "success": false, "error": "Unknown serviceId"}
  ]
}
```

---

## Security Best Practices

### 1. API Key Rotation
```bash
# Update API_KEYS environment variable with new keys
# Services using old keys will fail authentication

# Recommended: Use a grace period with both old and new keys
# Then remove old keys after all clients have updated
```

### 2. Principle of Least Privilege
- Each service should have its own unique API key
- Group services by trust boundary (dev/staging/prod)
- Use per-service tokens for multi-tenant scenarios

### 3. Key Storage
- **Never** commit API keys to version control
- Use environment variables or secret management systems
- Rotate keys regularly

### 4. Monitoring
- Check logs for authentication failures
- Alert on unusual patterns (many auth failures)
- Monitor which services are successfully authenticating

---

## Authentication Decision Matrix

| Scenario | Mode | Authorization Header | Payload Format |
|----------|------|---------------------|----------------|
| Single service | Single | Required | `{"serviceId": "s1"}` |
| Same key for all | Batch Shared | Required | `{"services": ["s1", "s2"]}` |
| Different keys | Batch Per-Service | Optional | `{"services": [{"serviceId": "s1", "token": "k1"}]}` |
| Mix of both | Hybrid | Required for some | `{"services": ["s1", {"serviceId": "s2", "token": "k2"}]}` |

---

## Common Authentication Errors

### Error: "Invalid API key"
**Cause:** Token doesn't match the expected key for the service

**Solution:**
- Verify API_KEYS configuration
- Check Authorization header or per-service token
- Ensure no typos in service ID or key

### Error: "Unknown serviceId"
**Cause:** Service not found in services.json configuration

**Solution:**
- Add service to services.json
- Check for typos in serviceId
- Redeploy worker after config changes

### Error: "Server configuration error"
**Cause:** API_KEYS environment variable is not valid JSON

**Solution:**
- Validate JSON format of API_KEYS
- Check for escaped quotes and commas
- Use a JSON validator before setting

---

## Testing Authentication

### Test Single Service
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer test-key" \
  -d '{"serviceId": "test-service"}' \
  -v
```

### Test Batch with Shared Key
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer shared-key" \
  -d '{"services": ["service1", "service2"]}' \
  -v
```

### Test Per-Service Tokens
```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -d '{
    "services": [
      {"serviceId": "s1", "token": "key1"},
      {"serviceId": "s2", "token": "key2"}
    ]
  }' \
  -v
```

### Test Invalid Authentication
```bash
# Should return 400 or 207 with error
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer wrong-key" \
  -d '{"serviceId": "test-service"}' \
  -v
```

---

## Summary

The authentication system provides maximum flexibility:

✅ **Backward compatible** - Existing single-service clients continue working  
✅ **Efficient** - Batch requests reduce API calls  
✅ **Flexible** - Support for shared and per-service keys  
✅ **Secure** - Each service validates against its own key  
✅ **Transparent** - Detailed per-service success/failure reporting  

Choose the mode that best fits your architecture and security requirements!

