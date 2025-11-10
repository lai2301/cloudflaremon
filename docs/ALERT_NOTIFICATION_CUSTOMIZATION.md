# Alert Notification Customization

This guide explains how to customize the dashboard's real-time alert notification system.

## Overview

The dashboard can display real-time notifications for alerts through:
- **Toast notifications** - Slide-in notifications in the bottom-right corner
- **Browser notifications** - Native OS notifications

All aspects of the notification system are configurable.

## Configuration

Edit `config/settings.json` to customize alert notifications:

```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 10,
    "localStorageKey": "last-alert-timestamp",
    "severityFilter": ["critical", "error", "warning"],
    "enableToastNotifications": true,
    "enableBrowserNotifications": true
  }
}
```

### Configuration Options

#### `pollingIntervalSeconds`
- **Type:** Number
- **Default:** `10`
- **Description:** How often (in seconds) to check for new alerts
- **Range:** `5` to `300` (5 seconds to 5 minutes)
- **Examples:**
  ```json
  "pollingIntervalSeconds": 5    // Check every 5 seconds (aggressive)
  "pollingIntervalSeconds": 30   // Check every 30 seconds (balanced)
  "pollingIntervalSeconds": 60   // Check every 1 minute (conservative)
  ```

#### `localStorageKey`
- **Type:** String
- **Default:** `"last-alert-timestamp"`
- **Description:** Browser localStorage key to track the last seen alert timestamp
- **Use case:** Change if you have multiple dashboard instances and want independent tracking
- **Examples:**
  ```json
  "localStorageKey": "last-alert-timestamp"          // Default
  "localStorageKey": "prod-monitor-last-alert"       // Production environment
  "localStorageKey": "staging-monitor-last-alert"    // Staging environment
  ```

#### `severityFilter`
- **Type:** Array of strings
- **Default:** `["critical", "error", "warning"]`
- **Description:** Only show notifications for these severity levels
- **Options:** `"critical"`, `"error"`, `"warning"`, `"info"`, `"success"`
- **Special:** Empty array `[]` disables filtering (shows all alerts)
- **Examples:**
  ```json
  // Only critical alerts
  "severityFilter": ["critical"]
  
  // Critical and errors only
  "severityFilter": ["critical", "error"]
  
  // All alerts except info
  "severityFilter": ["critical", "error", "warning", "success"]
  
  // Show all alerts (no filtering)
  "severityFilter": []
  ```

#### `enableToastNotifications`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable toast notifications (slide-in notifications in dashboard)
- **Examples:**
  ```json
  "enableToastNotifications": true   // Show toast notifications
  "enableToastNotifications": false  // Disable toast notifications
  ```

#### `enableBrowserNotifications`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable browser notifications (native OS notifications)
- **Note:** User must grant browser notification permission
- **Examples:**
  ```json
  "enableBrowserNotifications": true   // Show browser notifications
  "enableBrowserNotifications": false  // Disable browser notifications
  ```

## Common Scenarios

### Scenario 1: High-Priority Alerts Only
Only get notified about critical issues:

```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 10,
    "severityFilter": ["critical"],
    "enableToastNotifications": true,
    "enableBrowserNotifications": true
  }
}
```

### Scenario 2: Reduce Notification Noise
Less frequent checks, only serious issues:

```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 60,
    "severityFilter": ["critical", "error"],
    "enableToastNotifications": true,
    "enableBrowserNotifications": false
  }
}
```

### Scenario 3: Silent Monitoring
No notifications, but alert history still available:

```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 60,
    "enableToastNotifications": false,
    "enableBrowserNotifications": false
  }
}
```

**Note:** Alerts are still collected and available in the Alert History (🔔 button).

### Scenario 4: Everything Enabled
Maximum awareness, all alert types:

```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 5,
    "severityFilter": [],
    "enableToastNotifications": true,
    "enableBrowserNotifications": true
  }
}
```

### Scenario 5: Multiple Dashboard Instances
Track different environments independently:

**Production Dashboard:**
```json
{
  "alertNotifications": {
    "localStorageKey": "prod-monitor-last-alert",
    "severityFilter": ["critical", "error"]
  }
}
```

**Staging Dashboard:**
```json
{
  "alertNotifications": {
    "localStorageKey": "staging-monitor-last-alert",
    "severityFilter": []
  }
}
```

## Severity Levels

### Available Severity Levels

| Severity | Icon | Color | Typical Use Case |
|----------|------|-------|------------------|
| `critical` | 🚨 | Red | System down, immediate action required |
| `error` | ❌ | Red | Service failure, broken functionality |
| `warning` | ⚠️ | Orange | Potential issues, degraded performance |
| `info` | ℹ️ | Blue | Informational messages |
| `success` | ✅ | Green | Recovery, successful operations |

### Filter Priority

The `severityFilter` applies to **both** toast and browser notifications:

```json
"severityFilter": ["critical", "error"]
```

This configuration will:
- ✅ Show notifications for `critical` and `error` alerts
- ❌ Hide notifications for `warning`, `info`, and `success` alerts
- ℹ️ All alerts still visible in Alert History modal

## Performance Considerations

### Polling Interval

**Too Frequent (< 5 seconds):**
- ⚠️ Increased API calls
- ⚠️ Higher Cloudflare Worker invocations
- ⚠️ More battery usage on mobile devices

**Recommended (10-30 seconds):**
- ✅ Good balance between responsiveness and resource usage
- ✅ Suitable for most monitoring scenarios

**Too Infrequent (> 120 seconds):**
- ⚠️ Delayed alert notifications
- ⚠️ May miss rapid state changes

### API Endpoint Control

If you don't need real-time notifications, you can disable the alert polling by disabling the API endpoint:

```json
{
  "api": {
    "enableAlertHistoryEndpoint": false
  }
}
```

This will:
- ❌ Disable alert polling
- ❌ Hide the Alert History button (🔔)
- ✅ Reduce Cloudflare Worker invocations

## Browser Notification Permission

### How It Works

1. **First alert arrives** → Browser requests notification permission
2. **User grants permission** → Future alerts show as OS notifications
3. **User denies permission** → Only toast notifications shown

### Re-enabling Browser Notifications

If you previously denied browser notifications:

**Chrome/Edge:**
1. Click the lock icon (🔒) in the address bar
2. Find "Notifications" → Select "Allow"
3. Refresh the dashboard

**Firefox:**
1. Click the lock icon (🔒) in the address bar
2. Permissions → Notifications → "Allow"
3. Refresh the dashboard

**Safari:**
1. Safari → Settings → Websites → Notifications
2. Find your dashboard URL → Select "Allow"
3. Refresh the dashboard

## Testing Notifications

Use the test notification endpoint to verify your configuration:

```bash
# Test a critical alert
curl -X POST "https://your-worker.workers.dev/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Critical Alert",
    "message": "Testing critical severity notification",
    "severity": "critical",
    "source": "test"
  }'

# Test a warning alert
curl -X POST "https://your-worker.workers.dev/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Warning Alert",
    "message": "Testing warning severity notification",
    "severity": "warning",
    "source": "test"
  }'

# Test an info alert (will be filtered if severityFilter is ["critical", "error", "warning"])
curl -X POST "https://your-worker.workers.dev/api/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Info Alert",
    "message": "Testing info severity notification",
    "severity": "info",
    "source": "test"
  }'
```

**Expected behavior with default config:**
- ✅ Critical and warning alerts → Show toast and browser notifications
- ❌ Info alert → Only visible in Alert History, no notifications

## Troubleshooting

### No Notifications Appearing

**Check configuration:**
```json
{
  "alertNotifications": {
    "enableToastNotifications": true,
    "enableBrowserNotifications": true
  }
}
```

**Check API endpoint is enabled:**
```json
{
  "api": {
    "enableAlertHistoryEndpoint": true
  }
}
```

**Check browser console for errors:**
- Open Developer Tools (F12)
- Look for API fetch errors or JavaScript errors

### Notifications Too Frequent

**Increase polling interval:**
```json
{
  "alertNotifications": {
    "pollingIntervalSeconds": 30  // or higher
  }
}
```

### Wrong Alerts Showing

**Adjust severity filter:**
```json
{
  "alertNotifications": {
    "severityFilter": ["critical", "error"]  // Only serious issues
  }
}
```

### Browser Notifications Not Working

1. **Check permission** - Look for 🔔 or 🔒 icon in address bar
2. **Check browser support** - Notifications work in Chrome, Firefox, Safari, Edge
3. **Check configuration** - `enableBrowserNotifications: true`
4. **Check HTTPS** - Browser notifications require HTTPS

## Related Documentation

- [Alert Notifications Guide](./ALERT_NOTIFICATIONS.md) - Overview and setup
- [Alert History Housekeeping](./ALERT_HISTORY_HOUSEKEEPING.md) - Managing alert retention
- [API Configuration](./API_CONFIGURATION.md) - Enabling/disabling API endpoints
- [Settings Configuration](../examples/settings.example.json) - Full configuration reference

## Deployment

After changing notification settings:

```bash
npx wrangler deploy
```

Changes take effect immediately on the next page load (no cache clearing needed).

## Best Practices

1. **Start Conservative** - Begin with default settings, adjust based on your needs
2. **Test Your Filter** - Send test alerts to verify severity filtering works as expected
3. **Consider Your Team** - If multiple people monitor, discuss notification preferences
4. **Monitor Performance** - If you have many services, avoid very frequent polling
5. **Use Severity Wisely** - Define clear criteria for each severity level
6. **Document Your Config** - Add comments to your `settings.json` for team clarity

