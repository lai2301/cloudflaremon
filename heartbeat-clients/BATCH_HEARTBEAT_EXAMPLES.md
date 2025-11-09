# Batch Heartbeat API Examples

The `/api/heartbeat` endpoint supports both **single service** and **batch (multiple services)** heartbeats.

## Single Service Heartbeat

Send a heartbeat for one service:

### Request
```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "serviceId": "service-1"
  }'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Heartbeat received",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Batch Heartbeat (Multiple Services)

Send heartbeats for multiple services in a single request:

### Request
```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "services": ["service-1", "service-2", "service-3"]
  }'
```

### Response - All Succeeded (200 OK)
```json
{
  "success": true,
  "message": "Batch heartbeat received for 3 service(s)",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {
      "serviceId": "service-1",
      "success": true,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "serviceId": "service-2",
      "success": true,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "serviceId": "service-3",
      "success": true,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Response - Partial Success (207 Multi-Status)
When some services succeed and some fail:
```json
{
  "success": true,
  "message": "Partial success: 2 succeeded, 1 failed",
  "results": [
    {
      "serviceId": "service-1",
      "success": true,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "serviceId": "service-2",
      "success": false,
      "error": "Unknown serviceId"
    },
    {
      "serviceId": "service-3",
      "success": true,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Response - All Failed (400 Bad Request)
```json
{
  "success": false,
  "message": "All heartbeats failed",
  "results": [
    {
      "serviceId": "unknown-service",
      "success": false,
      "error": "Unknown serviceId"
    }
  ]
}
```

---

## API Key Authentication

The heartbeat API supports three authentication methods:

### 1. Single Service with Header Token
Standard authentication using Authorization header:

```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Authorization: Bearer service-1-api-key" \
  -d '{"serviceId": "service-1"}'
```

### 2. Shared Token (Batch Mode)
When multiple services share the same API key:

```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Authorization: Bearer shared-api-key" \
  -d '{
    "services": ["service-1", "service-2", "service-3"]
  }'
```

✅ **Use when:** All services share the same API key (e.g., grouped by environment)

### 3. Per-Service Tokens (Batch Mode) 🆕
When services have different API keys, provide tokens in the payload:

```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      { "serviceId": "service-1", "token": "key-for-service-1" },
      { "serviceId": "service-2", "token": "key-for-service-2" },
      { "serviceId": "service-3", "token": "key-for-service-3" }
    ]
  }'
```

✅ **Use when:** Services have different API keys but you want a single batch request

### 4. Mixed Authentication (Hybrid Mode)
Combine shared header token with per-service overrides:

```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Authorization: Bearer default-key" \
  -d '{
    "services": [
      "service-1",
      "service-2",
      { "serviceId": "service-3", "token": "special-key-for-3" }
    ]
  }'
```

In this example:
- `service-1` and `service-2` use the `Authorization` header (`default-key`)
- `service-3` uses its own token (`special-key-for-3`)

✅ **Use when:** Most services share a key, but some need different authentication

---

## Error Handling

### Invalid Payload
```json
{
  "error": "Either serviceId or services array is required",
  "usage": {
    "single": "{ \"serviceId\": \"service-1\" }",
    "batch": "{ \"services\": [\"service-1\", \"service-2\"] }"
  }
}
```

### Empty Services Array
```json
{
  "error": "services array cannot be empty"
}
```

---

## Benefits of Batch Mode

1. **Reduced Network Overhead**: One request instead of multiple
2. **Lower Latency**: Single round-trip to the server
3. **Atomic Timestamp**: All services get the same heartbeat timestamp
4. **Efficient for Containers**: Update multiple services from one sidecar

---

## Use Cases

### Single Mode
- Independent services with separate schedules
- Services with different API keys
- Simple monitoring setups

### Batch Mode
- Multiple microservices running on the same host
- Container sidecars monitoring multiple services
- Kubernetes deployments with multiple services per pod
- Centralized monitoring agents

---

## Performance Considerations

- **Batch requests** are more efficient and use fewer Worker invocations
- Maximum recommended services per batch: **50-100**
- For very large deployments (100+ services), consider splitting into multiple batches
- A 5-minute cron with batch mode for 10 services = **288 requests/day** (vs 2,880 for individual requests)

---

## Authentication Decision Tree

```
Do you have multiple services?
├── NO → Use single service format with Authorization header
└── YES
    └── Do all services share the same API key?
        ├── YES → Use batch mode with shared Authorization header
        │         { "services": ["s1", "s2", "s3"] }
        │
        └── NO → Do you want to make one request?
            ├── YES → Use per-service tokens in payload
            │         { "services": [
            │           {"serviceId": "s1", "token": "key1"},
            │           {"serviceId": "s2", "token": "key2"}
            │         ]}
            │
            └── NO → Make separate requests per service
```

---

## Real-World Examples

### Example 1: Kubernetes Pod with Multiple Containers

**Scenario:** One pod running 3 containers, all sharing a pod-level API key

```python
import requests

POD_API_KEY = os.environ['POD_API_KEY']

requests.post(
    "https://mon.example.com/api/heartbeat",
    headers={"Authorization": f"Bearer {POD_API_KEY}"},
    json={
        "services": [
            "pod-frontend",
            "pod-backend", 
            "pod-cache"
        ]
    }
)
```

### Example 2: Multi-Tenant Monitoring Agent

**Scenario:** Agent monitors services from different customers with different API keys

```python
import requests

services_config = [
    {"serviceId": "customer-a-web", "token": "cust_a_key_123"},
    {"serviceId": "customer-a-api", "token": "cust_a_key_123"},
    {"serviceId": "customer-b-web", "token": "cust_b_key_456"},
    {"serviceId": "customer-b-api", "token": "cust_b_key_456"},
]

requests.post(
    "https://mon.example.com/api/heartbeat",
    json={"services": services_config}
)
```

### Example 3: Hybrid - Shared Key with Special Service

**Scenario:** Most services use default key, but production DB has a special key

```bash
curl -X POST https://mon.example.com/api/heartbeat \
  -H "Authorization: Bearer default-dev-key" \
  -d '{
    "services": [
      "dev-service-1",
      "dev-service-2",
      "dev-service-3",
      {"serviceId": "prod-critical-db", "token": "ultra-secure-prod-key"}
    ]
  }'
```

---

## Example: Monitoring Multiple Docker Containers

```bash
#!/bin/bash
# Monitor multiple Docker containers with a single heartbeat

# Get running container names
CONTAINERS=$(docker ps --format '{{.Names}}')

# Build services array
SERVICES_JSON="["
FIRST=true
for CONTAINER in $CONTAINERS; do
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    SERVICES_JSON+=","
  fi
  SERVICES_JSON+="\"$CONTAINER\""
done
SERVICES_JSON+="]"

# Send batch heartbeat
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Authorization: Bearer $API_KEY" \
  -d "{\"services\": $SERVICES_JSON}"
```

---

## Example: Python with Multiple Services

```python
import requests

WORKER_URL = "https://your-worker.workers.dev/api/heartbeat"
API_KEY = "your-shared-api-key"

# Send batch heartbeat
response = requests.post(
    WORKER_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "services": [
            "web-frontend",
            "api-backend",
            "redis-cache",
            "postgres-db"
        ]
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

