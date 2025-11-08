# Authentication Configuration in services.json

You can now control whether authentication is required on a **per-service** or **per-group** basis using the `auth.required` setting in `services.json`.

## Overview

The `auth` configuration allows you to:
- Require authentication for production services
- Disable authentication for internal/development services
- Override group-level settings at the service level
- Mix authenticated and non-authenticated services in the same deployment

## Configuration Structure

### Group-Level Auth

Set authentication requirements for all services in a group:

```json
{
  "groups": [
    {
      "id": "production",
      "name": "Production Services",
      "services": ["prod-api", "prod-db"],
      "auth": {
        "required": true
      }
    }
  ]
}
```

### Service-Level Auth

Override group settings or set auth for individual services:

```json
{
  "services": [
    {
      "id": "prod-api",
      "name": "Production API",
      "enabled": true,
      "auth": {
        "required": true
      }
    }
  ]
}
```

## Inheritance & Override Rules

**Priority Order (highest to lowest):**
1. **Service-level** `auth.required` setting
2. **Group-level** `auth.required` setting  
3. **Default** (true - authentication required)

**Example:**
```json
{
  "groups": [
    {
      "id": "infrastructure",
      "name": "Infrastructure",
      "services": ["backup-service", "monitoring-agent"],
      "auth": {
        "required": false  // ← Group default: no auth
      }
    }
  ],
  "services": [
    {
      "id": "backup-service",
      "name": "Backup Service",
      "enabled": true
      // Uses group setting: auth.required = false
    },
    {
      "id": "monitoring-agent",
      "name": "Monitoring Agent",
      "enabled": true,
      "auth": {
        "required": true  // ← Override: requires auth despite group setting
      }
    }
  ]
}
```

**Result:**
- `backup-service` → No authentication required (inherits from group)
- `monitoring-agent` → Authentication required (overrides group)

## Use Cases

### Use Case 1: Production Requires Auth, Development Doesn't

```json
{
  "groups": [
    {
      "id": "production",
      "name": "Production",
      "services": ["prod-api", "prod-db"],
      "auth": {
        "required": true
      }
    },
    {
      "id": "development",
      "name": "Development",
      "services": ["dev-api", "dev-db"],
      "auth": {
        "required": false
      }
    }
  ],
  "services": [
    {"id": "prod-api", "name": "Prod API", "enabled": true},
    {"id": "prod-db", "name": "Prod DB", "enabled": true},
    {"id": "dev-api", "name": "Dev API", "enabled": true},
    {"id": "dev-db", "name": "Dev DB", "enabled": true}
  ]
}
```

**Heartbeat Behavior:**
```bash
# Production services - require API key
curl -H "Authorization: Bearer prod-key" \
  -d '{"serviceId": "prod-api"}' \
  https://mon.example.com/api/heartbeat

# Development services - no API key needed
curl -d '{"serviceId": "dev-api"}' \
  https://mon.example.com/api/heartbeat
```

### Use Case 2: Internal Network Services (No Auth)

```json
{
  "groups": [
    {
      "id": "internal",
      "name": "Internal Services",
      "services": ["internal-api", "internal-db"],
      "auth": {
        "required": false
      }
    }
  ],
  "services": [
    {"id": "internal-api", "name": "Internal API", "enabled": true},
    {"id": "internal-db", "name": "Internal DB", "enabled": true}
  ]
}
```

**All services accept heartbeats without authentication:**
```bash
curl -d '{"services": ["internal-api", "internal-db"]}' \
  https://mon.example.com/api/heartbeat
```

### Use Case 3: Mixed Authentication

```json
{
  "groups": [
    {
      "id": "mixed",
      "name": "Mixed Services",
      "services": ["service-a", "service-b", "service-c"],
      "auth": {
        "required": false
      }
    }
  ],
  "services": [
    {
      "id": "service-a",
      "name": "Service A (Public)",
      "enabled": true
      // No auth required (uses group default)
    },
    {
      "id": "service-b",
      "name": "Service B (Protected)",
      "enabled": true,
      "auth": {
        "required": true  // Override: requires auth
      }
    },
    {
      "id": "service-c",
      "name": "Service C (Public)",
      "enabled": true
      // No auth required (uses group default)
    }
  ]
}
```

**Batch Heartbeat with Mixed Auth:**
```bash
curl -d '{
  "services": [
    "service-a",
    {"serviceId": "service-b", "token": "secret-key-for-b"},
    "service-c"
  ]
}' https://mon.example.com/api/heartbeat
```

## How It Works

### 1. Configuration Merging

When the worker starts:
```
1. Load services.json
2. For each service:
   a. Check if service belongs to a group
   b. Merge group.auth.required into service
   c. Service-level auth.required overrides group setting
   d. Default to true if not specified
```

### 2. Request Validation

When a heartbeat arrives:
```
1. Parse service ID from request
2. Load service configuration
3. Check auth.required setting:
   ├─ If false → Skip authentication, accept heartbeat
   ├─ If true and API_KEYS set → Validate API key
   └─ If true and no API_KEYS → Log warning, accept heartbeat
4. Process heartbeat for authenticated/authorized services
```

### 3. Logging

The system logs authentication decisions:

```
✓ Service service-2 has auth disabled - skipping authentication
⚠ Service prod-api requires auth but has no API key configured in API_KEYS
✗ Invalid API key for service prod-api
```

## Configuration Examples

### Example 1: All Services Require Auth (Default)

**Don't specify auth settings:**
```json
{
  "services": [
    {"id": "service-1", "name": "Service 1", "enabled": true},
    {"id": "service-2", "name": "Service 2", "enabled": true}
  ]
}
```

**Behavior:** All services require authentication (default = true)

### Example 2: Disable Auth Globally

```json
{
  "groups": [
    {
      "id": "all-services",
      "name": "All Services",
      "services": ["service-1", "service-2"],
      "auth": {
        "required": false
      }
    }
  ],
  "services": [
    {"id": "service-1", "name": "Service 1", "enabled": true},
    {"id": "service-2", "name": "Service 2", "enabled": true}
  ]
}
```

**Behavior:** No services require authentication

### Example 3: Per-Environment Configuration

```json
{
  "groups": [
    {
      "id": "production",
      "services": ["prod-api", "prod-worker"],
      "auth": {"required": true}
    },
    {
      "id": "staging", 
      "services": ["stage-api", "stage-worker"],
      "auth": {"required": true}
    },
    {
      "id": "development",
      "services": ["dev-api", "dev-worker"],
      "auth": {"required": false}
    }
  ],
  "services": [
    {"id": "prod-api", "enabled": true},
    {"id": "prod-worker", "enabled": true},
    {"id": "stage-api", "enabled": true},
    {"id": "stage-worker", "enabled": true},
    {"id": "dev-api", "enabled": true},
    {"id": "dev-worker", "enabled": true}
  ]
}
```

## API_KEYS Interaction

### Scenario 1: auth.required = true, API_KEYS set

```json
// services.json
{"auth": {"required": true}}

// API_KEYS environment variable
{"service-1": "secret-key"}
```

**Behavior:** API key validation is enforced

### Scenario 2: auth.required = true, API_KEYS not set

```json
// services.json
{"auth": {"required": true}}

// API_KEYS environment variable: (not set)
```

**Behavior:** 
- Warning logged: "Service requires auth but has no API key configured"
- Heartbeat is **accepted** (fail-open for backward compatibility)

### Scenario 3: auth.required = false, API_KEYS set

```json
// services.json
{"auth": {"required": false}}

// API_KEYS environment variable
{"service-1": "secret-key"}
```

**Behavior:** API key validation is **skipped** (auth disabled for service)

### Scenario 4: auth.required = false, API_KEYS not set

```json
// services.json  
{"auth": {"required": false}}

// API_KEYS environment variable: (not set)
```

**Behavior:** No authentication required or performed

## Best Practices

### 1. Security by Default
✅ **DO:** Leave `auth.required` unset (defaults to true) for production services
```json
{"id": "prod-api", "enabled": true}
// Defaults to auth.required = true
```

❌ **DON'T:** Disable auth for production without good reason

### 2. Explicit Configuration
✅ **DO:** Explicitly set `auth.required = false` when you intentionally want no auth
```json
{"id": "internal-service", "auth": {"required": false}}
// Clear intent: no auth wanted
```

### 3. Group-Level Defaults
✅ **DO:** Use groups to set consistent auth policies
```json
{
  "groups": [
    {"id": "production", "auth": {"required": true}},
    {"id": "development", "auth": {"required": false}}
  ]
}
```

### 4. Service-Level Overrides
✅ **DO:** Override at service level for exceptions
```json
{
  "groups": [{"id": "dev", "auth": {"required": false}}],
  "services": [
    {"id": "dev-api", "enabled": true},
    {"id": "dev-critical", "auth": {"required": true}}
  ]
}
```

## Migration Guide

### From: Global Authentication (Old Behavior)

**Before:** All services either required auth or didn't (based on API_KEYS being set)

**After:** Per-service control

**Steps:**
1. Review your current setup
2. Add `auth` settings to services.json
3. Set `required: false` for services that shouldn't need auth
4. Keep/set `required: true` for services that should need auth

### Example Migration

**Before (implicit):**
```json
{
  "services": [
    {"id": "service-1", "enabled": true},
    {"id": "service-2", "enabled": true}
  ]
}
// API_KEYS set → all require auth
// API_KEYS not set → none require auth
```

**After (explicit):**
```json
{
  "groups": [
    {
      "id": "secure",
      "services": ["service-1"],
      "auth": {"required": true}
    },
    {
      "id": "internal",
      "services": ["service-2"],
      "auth": {"required": false}
    }
  ],
  "services": [
    {"id": "service-1", "enabled": true},
    {"id": "service-2", "enabled": true}
  ]
}
```

## Troubleshooting

### Issue: Service not accepting heartbeats

**Check:**
1. Is `auth.required` set to true?
2. Is API_KEYS environment variable set?
3. Does the service have an entry in API_KEYS?
4. Is the API key correct in the heartbeat request?

**Debug:**
```bash
# Check worker logs in Cloudflare Dashboard
# Look for messages like:
# "Service X requires auth but has no API key configured"
# "Service X has auth disabled - skipping authentication"
# "Invalid API key for service X"
```

### Issue: Want to disable auth but still using API keys

**Solution:** Set `auth.required = false` for specific services:
```json
{
  "id": "internal-service",
  "auth": {"required": false}
}
```

Even if API_KEYS is set, this service won't require authentication.

## Summary

| Setting Location | Priority | Use When |
|-----------------|----------|----------|
| Service-level | Highest | Need exception to group policy |
| Group-level | Medium | Multiple services share policy |
| Default | Lowest | No setting specified (true) |

**Key Points:**
- ✅ Service-level overrides group-level
- ✅ Default is `true` (secure by default)
- ✅ `auth.required = false` explicitly disables auth
- ✅ Compatible with all authentication modes (shared key, per-service tokens, etc.)
- ✅ Backward compatible (existing configs work as before)

