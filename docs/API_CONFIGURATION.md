# API Configuration

## Overview

You can enable or disable individual API endpoints in `config/settings.json`. This is useful when:
- The dashboard uses embedded data and doesn't need API calls
- You want to reduce attack surface
- You only need specific endpoints for external integrations

## Configuration

Edit `config/settings.json`:

```json
{
  "api": {
    "enableStatusEndpoint": true,
    "enableUptimeEndpoint": true,
    "enableServicesEndpoint": true,
    "enableHeartbeatEndpoint": true,
    "enableAlertEndpoints": true,
    "enableTestNotificationEndpoint": false
  }
}
```

## Available Endpoints

### `/api/heartbeat` (POST)
- **Setting:** `enableHeartbeatEndpoint`
- **Required for:** Receiving heartbeats from services
- **Can disable if:** You have no services sending heartbeats
- **Default:** `true` (always keep enabled)

### `/api/status` (GET)
- **Setting:** `enableStatusEndpoint`
- **Required for:** External monitoring tools, dashboard refresh button
- **Can disable if:** Using embedded data only, no external integrations
- **Default:** `true`

### `/api/uptime` (GET)
- **Setting:** `enableUptimeEndpoint`
- **Required for:** External reporting, dashboard refresh button
- **Can disable if:** Using embedded data only, no CSV exports
- **Default:** `true`

### `/api/services` (GET)
- **Setting:** `enableServicesEndpoint`
- **Required for:** External tools listing configured services
- **Can disable if:** No external integrations need service list
- **Default:** `true`

### `/api/alert` (POST)
- **Setting:** `enableAlertEndpoint`
- **Required for:** External alert integrations (Grafana, Alertmanager, custom alerts)
- **Can disable if:** Not using external alert notifications
- **Default:** `true`

### `/api/alerts/recent` (GET)
- **Setting:** `enableAlertHistoryEndpoint`
- **Required for:** Dashboard alert history, alert polling
- **Can disable if:** Not using alert history feature
- **Default:** `true`
- **Config options:**
  - `alertHistory.defaultRecentPeriodHours`: Default time window for alerts (default: 24 hours)
  - `alertHistory.defaultLimit`: Maximum alerts to return (default: 20)

## Recommended Configurations

### Minimal (Dashboard Only)
If you only use the embedded dashboard and don't need external integrations:

```json
{
  "api": {
    "enableStatusEndpoint": false,
    "enableUptimeEndpoint": false,
    "enableServicesEndpoint": false,
    "enableHeartbeatEndpoint": true,
    "enableAlertEndpoint": true,
    "enableAlertHistoryEndpoint": true
  }
}
```

**Note:** Keep `enableHeartbeatEndpoint` enabled or services can't report status!

### Maximum Security
For a completely locked-down dashboard with no external API access:

```json
{
  "api": {
    "enableStatusEndpoint": false,
    "enableUptimeEndpoint": false,
    "enableServicesEndpoint": false,
    "enableHeartbeatEndpoint": true,
    "enableAlertEndpoint": false,
    "enableAlertHistoryEndpoint": false
  }
}
```

### Full Access (Default)
All endpoints enabled for maximum flexibility:

```json
{
  "api": {
    "enableStatusEndpoint": true,
    "enableUptimeEndpoint": true,
    "enableServicesEndpoint": true,
    "enableHeartbeatEndpoint": true,
    "enableAlertEndpoint": true,
    "enableAlertHistoryEndpoint": true
  },
  "alertHistory": {
    "defaultRecentPeriodHours": 24,
    "defaultLimit": 20
  }
}
```

## Disabled Endpoint Behavior

When an endpoint is disabled, requests return:

**HTTP 403 Forbidden**
```json
{
  "error": "Status API is disabled"
}
```

## Important Notes

1. **Dashboard still works** - The dashboard uses embedded data, not API calls
2. **UI buttons auto-hide** - When you disable an endpoint, related buttons automatically hide:
   - `enableUptimeEndpoint: false` → Export CSV button hidden
   - `enableAlertHistoryEndpoint: false` → Alert History button hidden  
   - Both status/uptime disabled → Refresh buttons hidden
3. **Alert endpoints separated** - You can now independently control:
   - `enableAlertEndpoint` - For external alerts (POST `/api/alert`)
   - `enableAlertHistoryEndpoint` - For dashboard history (GET `/api/alerts/recent`)
4. **Configurable alert period** - Use `alertHistory.defaultRecentPeriodHours` to control the default time window
5. **Test endpoint** - Can be disabled via `enableTestNotificationEndpoint`
6. **Heartbeat endpoint** - Almost always keep this enabled, or services can't report status
7. **Export feature** - Requires `enableUptimeEndpoint` to work

## Alert History API Usage

The `/api/alerts/recent` endpoint supports several query parameters:

### Query Parameters

- **`since`** (ISO timestamp) - Get alerts after this timestamp
  ```
  GET /api/alerts/recent?since=2025-11-10T00:00:00.000Z
  ```

- **`hours`** (number) - Get alerts from the last N hours (overrides config default)
  ```
  GET /api/alerts/recent?hours=12
  ```

- **`limit`** (number) - Maximum alerts to return (overrides config default)
  ```
  GET /api/alerts/recent?limit=50
  ```

### Examples

**Get last 24 hours (using config default):**
```bash
curl https://your-worker.workers.dev/api/alerts/recent
```

**Get last 12 hours:**
```bash
curl https://your-worker.workers.dev/api/alerts/recent?hours=12
```

**Get last 100 alerts from past 48 hours:**
```bash
curl https://your-worker.workers.dev/api/alerts/recent?hours=48&limit=100
```

**Get alerts since specific timestamp:**
```bash
curl "https://your-worker.workers.dev/api/alerts/recent?since=2025-11-10T00:00:00.000Z"
```

### Response Format

```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert:1699564800000:abc123",
      "title": "Service Down",
      "message": "web-server is not responding",
      "severity": "error",
      "source": "service",
      "timestamp": "2025-11-10T12:00:00.000Z",
      "read": false
    }
  ],
  "count": 1,
  "periodHours": 24
}
```

## Deployment

After changing settings:

```bash
npx wrangler deploy
```

The changes take effect immediately on the next request.

