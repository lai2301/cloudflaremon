# Alert Notifications Feature

Real-time notification system that shows toast notifications in the dashboard for:
- **External alerts** received via `/api/alert` (Grafana, Alertmanager, custom)
- **Service status changes** from heartbeat monitoring (down/up/degraded)

> 📝 **Want to customize?** See [Alert Notification Customization](./ALERT_NOTIFICATION_CUSTOMIZATION.md) for polling interval, severity filtering, and notification type settings.

## 🎉 Features

- **📱 Toast Notifications** - In-page notifications with title, message, and severity (configurable)
- **🔔 Browser Notifications** - System notifications (optional, requires permission, configurable)
- **🎨 Severity Colors** - Critical (red), Warning (yellow), Info (blue)
- **⏰ Auto-dismiss** - Toast notifications auto-close after 10 seconds
- **🔄 Real-time Polling** - Checks for new alerts (configurable interval, default 10 seconds)
- **💾 Persistent State** - Remembers last seen alert (no duplicates, configurable localStorage key)
- **🔧 Unified Alerts** - Both external and internal service alerts in one feed
- **🎯 Severity Filtering** - Show notifications only for specific severity levels (configurable)

---

## 📊 How It Works

### Alert Sources

The system collects alerts from **two sources**:

#### 1. **External Alerts** (via `/api/alert`)
When external monitoring tools call `/api/alert`:
```bash
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High CPU Usage",
    "message": "Server CPU usage at 95%",
    "severity": "warning"
  }'
```

**Supported formats:**
- Custom JSON alerts
- Grafana webhooks
- Alertmanager webhooks
- Any system that can POST JSON

#### 2. **Service Status Changes** (from heartbeat monitoring)
When services change status (automatically detected by cron checks):

- **Service goes down** → `🚨 Critical` alert
  - "Service Down: [Service Name]"
  - "[Service Name] is not responding. Last seen: [timestamp]"
  
- **Service recovers** → `ℹ️ Info` alert
  - "Service Recovered: [Service Name]"
  - "[Service Name] has recovered and is now operational."
  
- **Service degraded** → `⚠️ Warning` alert
  - "Service Degraded: [Service Name]"
  - "[Service Name] is experiencing degraded performance."

**Respects notification settings:**
- Uses cooldown period from `notifications.json`
- Honors per-service notification preferences
- Same alert visible in both external channels (Discord, Slack) and dashboard

### Alert Storage & Delivery

**1. Alert Stored**
- Alert is stored in KV (`recent:alerts`)
- Kept for up to 50 most recent alerts
- Includes timestamp, title, message, severity, source

**2. Dashboard Polls**
- Dashboard checks `/api/alerts/recent` every 10 seconds
- Only fetches alerts since last seen timestamp
- Prevents showing duplicates

**3. Notification Shown**
- **Toast notification** slides in from right
- **Browser notification** shown (if permitted)
- Auto-dismisses after 10 seconds
- User can manually close anytime

---

## 🎨 Notification Appearance

### Toast Notification (In-Page)

```
┌─────────────────────────────────────┐
│ 🚨 High CPU Usage            ×    │
│                                     │
│ Server CPU usage at 95%             │
│ 11/8/2025, 2:30:45 PM              │
└─────────────────────────────────────┘
```

- **Critical**: 🚨 Red border
- **Warning**: ⚠️  Yellow border
- **Info**: ℹ️  Blue border

### Browser Notification (System)

Shows as a system notification (Windows/Mac/Linux):
```
─────────────────────────────
⚠️ High CPU Usage

Server CPU usage at 95%
─────────────────────────────
```

---

## 🔧 Usage Examples

### Example 1: Send a Critical Alert

```bash
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Service Down",
    "message": "Production API is not responding",
    "severity": "critical",
    "source": "monitoring-system"
  }'
```

**Result:** 🚨 Red toast notification appears on dashboard

### Example 2: Send a Warning Alert

```bash
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Disk Space Low",
    "message": "Only 10% disk space remaining",
    "severity": "warning"
  }'
```

**Result:** ⚠️ Yellow toast notification appears

### Example 3: Send from Grafana

```bash
# Grafana webhook format
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CPU Alert",
    "state": "alerting",
    "message": "CPU usage above threshold",
    "ruleName": "High CPU Alert"
  }'
```

### Example 4: Send from Alertmanager

```bash
# Prometheus Alertmanager format
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighMemoryUsage",
        "severity": "warning"
      },
      "annotations": {
        "summary": "Memory usage is high",
        "description": "Memory usage at 85%"
      }
    }]
  }'
```

### Example 5: Service Status Change Alerts (Automatic)

**Service status change alerts are generated automatically** when heartbeat monitoring detects changes:

#### Service Goes Down
When a service stops sending heartbeats:

**Alert shown:**
```
🚨 Service Down: Internal API

Internal API is not responding. Last seen: 11/8/2025, 3:45:12 PM
```

**JSON structure:**
```json
{
  "id": "alert:1731085512000:abc123",
  "title": "Service Down: Internal API",
  "message": "Internal API is not responding. Last seen: 11/8/2025, 3:45:12 PM",
  "severity": "critical",
  "source": "heartbeat-monitor",
  "timestamp": "2025-11-08T15:45:12.000Z",
  "serviceId": "service-1",
  "status": "down"
}
```

#### Service Recovers
When a service resumes sending heartbeats:

**Alert shown:**
```
ℹ️ Service Recovered: Internal API

Internal API has recovered and is now operational.
```

#### Service Degraded
When a service reports degraded status:

**Alert shown:**
```
⚠️ Service Degraded: Internal API

Internal API is experiencing degraded performance.
```

**Configuration:**
- Service status alerts respect `notifications.json` settings
- Cooldown period applies (default: 5 minutes)
- Per-service notification preferences honored
- Appears in both dashboard and external channels (Discord, Slack)

---

## 🔔 Browser Notifications

### Enabling Browser Notifications

1. **Dashboard will auto-request permission** on first alert
2. **Or manually enable:**
   - Chrome: Click 🔔 icon in address bar
   - Firefox: Click ⓘ icon → Permissions
   - Safari: Safari → Preferences → Websites → Notifications

### Permission States

- **Granted** ✅ - Notifications shown
- **Denied** ❌ - Only toast notifications shown
- **Default** ⚠️ - Will ask for permission on first alert

### Example: Request Permission Manually

```javascript
// In browser console
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});
```

---

## ⚙️ API Endpoints

### POST `/api/alert`

Send an alert (triggers notification)

**Request:**
```json
{
  "title": "Alert Title",
  "message": "Alert message details",
  "severity": "warning"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert processed and notifications sent",
  "alertTitle": "Alert Title"
}
```

### GET `/api/alerts/recent`

Fetch recent alerts

**Parameters:**
- `since` (optional) - ISO timestamp, only return alerts after this time
- `limit` (optional) - Max number of alerts (default: 20)

**Request:**
```bash
GET /api/alerts/recent?since=2025-11-08T10:00:00Z&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "alerts": [
    {
      "id": "alert:1730000000000:abc123",
      "title": "High CPU Usage",
      "message": "Server CPU usage at 95%",
      "severity": "warning",
      "source": "external",
      "timestamp": "2025-11-08T14:30:00Z",
      "read": false
    }
  ]
}
```

---

## 🎯 Configuration

### Check Interval

Default: Every 10 seconds

**To change:**
Edit `src/core/notifications.js` (see `prepareVariables()` and notification sending functions):
```javascript
const ALERT_CHECK_INTERVAL = 10000; // milliseconds
```

### Auto-dismiss Timeout

Default: 10 seconds

**To change:**
Edit the dashboard script in `src/handlers/dashboard/index.js` (see alert rendering and event handling):
```javascript
setTimeout(() => {
    closeToast(toast);
}, 10000); // milliseconds
```

### Alert History Housekeeping

**Default settings:**
- Maximum alerts: 100
- Maximum age: 7 days
- Cleanup on add: Yes

**To configure:**
Edit `notifications.json`:
```json
{
  "settings": {
    "alertHistory": {
      "maxAlerts": 100,
      "maxAgeDays": 7,
      "cleanupOnAdd": true
    }
  }
}
```

**Cleanup happens:**
- Every time a new alert is added
- Removes alerts older than `maxAgeDays`
- Keeps only last `maxAlerts` entries

📚 **See:** [Alert History Housekeeping Guide](./ALERT_HISTORY_HOUSEKEEPING.md) for detailed configuration options.

---

## 🔍 How It Works Internally

### Flow Diagram

```
       ┌─────────────────────────────────────────────────────────┐
       │                     Alert Sources                        │
       └───────────────┬─────────────────────────┬────────────────┘
                       │                         │
       ┌───────────────▼───────────┐   ┌─────────▼──────────────┐
       │   External System         │   │   Heartbeat Monitor    │
       │   (Grafana, Alertmanager) │   │   (Cron Checks)        │
       └───────────────┬───────────┘   └─────────┬──────────────┘
                       │                         │
                       │ POST /api/alert         │ Service status
                       │                         │ change detected
                       ▼                         ▼
       ┌────────────────────────────────────────────────────────┐
       │          Cloudflare Worker                              │
       │  - Parse alert                                          │
       │  - Send notifications (Discord, Slack, etc.)           │
       │  - Store in KV                                          │
       └────────────────────────┬───────────────────────────────┘
                                │
                                │ Stored in KV
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  recent:alerts                                          │
       │  [External alerts + Service status changes]            │
       │  (Last 50 alerts)                                       │
       └────────────────────────┬───────────────────────────────┘
                                │
                                │ Polled every 10s
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  Dashboard                                              │
       │  GET /api/alerts/recent?since=timestamp                │
       └────────────────────────┬───────────────────────────────┘
                                │
                                │ New alerts?
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  Show Notifications                                     │
       │  - Toast notification (in-page)                         │
       │  - Browser notification (system)                        │
       │  - Critical: 🚨 Red border                             │
       │  - Warning: ⚠️  Yellow border                          │
       │  - Info: ℹ️  Blue border                               │
       └────────────────────────────────────────────────────────┘
```

### Data Storage

**KV Key:** `recent:alerts`

**Format:**
```json
[
  {
    "id": "alert:timestamp:random",
    "title": "string",
    "message": "string",
    "severity": "critical|warning|info",
    "source": "string",
    "timestamp": "ISO-8601",
    "read": false,
    "serviceId": "string (optional, for service status changes)",
    "status": "down|up|degraded (optional, for service status changes)"
  }
]
```

**Sources:**
- External alerts: `source` = custom (e.g., "grafana", "alertmanager", "custom-monitor")
- Service status changes: `source` = "heartbeat-monitor"

**Example - External Alert:**
```json
{
  "id": "alert:1731085512000:abc123",
  "title": "High CPU Usage",
  "message": "Server CPU usage at 95%",
  "severity": "warning",
  "source": "grafana",
  "timestamp": "2025-11-08T15:45:12.000Z",
  "read": false
}
```

**Example - Service Status Change:**
```json
{
  "id": "alert:1731085512000:def456",
  "title": "Service Down: Internal API",
  "message": "Internal API is not responding. Last seen: 11/8/2025, 3:45:12 PM",
  "severity": "critical",
  "source": "heartbeat-monitor",
  "timestamp": "2025-11-08T15:45:12.000Z",
  "read": false,
  "serviceId": "service-1",
  "status": "down"
}
```

---

## 🐛 Troubleshooting

### Issue: No notifications appearing

**Check:**
1. Dashboard is open and running
2. Browser console for errors
3. Alerts are being stored: `GET /api/alerts/recent`
4. No JavaScript errors in console

**Debug:**
```javascript
// In browser console
localStorage.getItem('last-alert-timestamp'); // Check last seen
```

### Issue: Duplicate notifications

**Cause:** Multiple dashboard tabs open

**Solution:** Close extra tabs or clear:
```javascript
localStorage.removeItem('last-alert-timestamp');
```

### Issue: Browser notifications not showing

**Check:**
1. Permission granted: `Notification.permission`
2. Browser supports: `'Notification' in window`
3. Not in incognito/private mode
4. System "Do Not Disturb" mode off

**Debug:**
```javascript
// Check permission
console.log(Notification.permission);

// Request permission
Notification.requestPermission();
```

### Issue: Toast appearing off-screen

**Mobile devices:** Toasts automatically adjust to screen width

**Fix manually:**
```css
@media (max-width: 768px) {
    .alert-toast-container {
        left: 20px;
        right: 20px;
    }
}
```

---

## 📱 Mobile Compatibility

- ✅ **Toast notifications** work on all devices
- ⚠️ **Browser notifications** vary by mobile browser:
  - **iOS Safari:** Not supported
  - **Android Chrome:** Supported
  - **Android Firefox:** Supported

---

## 🔒 Security

### Authentication

**Optional:** Set `ALERT_API_KEY` environment variable to require authentication:

```bash
# In Cloudflare dashboard or wrangler
ALERT_API_KEY=your-secret-alert-key
```

**Usage:**
```bash
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Authorization: Bearer your-secret-alert-key" \
  -d '{"title":"Alert","message":"Test"}'
```

### Rate Limiting

**Dashboard polling:** Every 10 seconds (6 requests/minute)

**Recommendation:** Add Cloudflare rate limiting if needed:
- Dashboard: 6 req/min per IP
- Alert submission: 60 req/min per IP

---

## 🚀 Quick Start

### 1. Deploy the Updated Worker

```bash
npx wrangler deploy
```

### 2. Open Dashboard

```
https://mon.pipdor.com
```

### 3. Test Alerts

#### Option A: Send External Alert

```bash
curl -X POST https://mon.pipdor.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "This is a test notification",
    "severity": "info"
  }'
```

#### Option B: Trigger Service Status Change

1. **Send heartbeats** to establish service as "up"
2. **Stop heartbeats** to trigger "Service Down" alert
3. **Resume heartbeats** to trigger "Service Recovered" alert

### 4. See Notification

- Toast notification slides in from right ✅
- Browser notification (if permitted) 🔔
- Auto-dismisses after 10 seconds ⏰

---

## 🧪 Local Testing

### Start Local Dev Server

```bash
cd /path/to/cloudflaremon
npx wrangler dev --local
```

Server will start at: `http://localhost:8787`

### Run Comprehensive Test

```bash
# Test both external alerts AND service status changes
./test-all-notifications.sh
```

This will:
- ✅ Send external alerts (critical, warning, info)
- ✅ Send Grafana-format alerts
- ✅ Send Alertmanager-format alerts
- ✅ Establish service heartbeat (for status changes)
- ✅ Fetch recent alerts to verify storage

### Open Dashboard

```
http://localhost:8787
```

**Within 10 seconds:**
- 🎊 Toast notifications appear
- 🔔 Browser notification prompt
- 📱 All alerts visible

### Trigger Service Status Change (Local)

#### Step 1: Establish Service as "Up"
```bash
# Send heartbeats every minute for 5 minutes
for i in {1..5}; do
  curl -X POST http://localhost:8787/api/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"serviceId": "service-1"}'
  sleep 60
done
```

#### Step 2: Stop Heartbeats
Wait for cron check (next scheduled time, e.g., every 10 minutes)

**Result:** "🚨 Service Down: [Service Name]" notification

#### Step 3: Resume Heartbeats
```bash
curl -X POST http://localhost:8787/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "service-1"}'
```

Wait for next cron check

**Result:** "ℹ️ Service Recovered: [Service Name]" notification

---

## 📊 Examples with Different Tools

### Prometheus Alertmanager

```yaml
# alertmanager.yml
receivers:
  - name: 'cloudflare-monitor'
    webhook_configs:
      - url: 'https://mon.pipdor.com/api/alert'
        send_resolved: true
```

### Grafana

```json
{
  "url": "https://mon.pipdor.com/api/alert",
  "httpMethod": "POST"
}
```

### Custom Script

```python
import requests

def send_alert(title, message, severity='warning'):
    requests.post('https://mon.pipdor.com/api/alert', json={
        'title': title,
        'message': message,
        'severity': severity
    })

send_alert('Backup Failed', 'Daily backup did not complete', 'critical')
```

---

## ✨ Summary

- ✅ **Real-time notifications** for external alerts
- ✅ **Toast + Browser notifications** with auto-dismiss
- ✅ **Severity-based styling** (critical, warning, info)
- ✅ **10-second polling** for new alerts
- ✅ **No duplicates** via timestamp tracking
- ✅ **Works with Grafana, Alertmanager, custom integrations**
- ✅ **Mobile-responsive** design
- ✅ **Optional authentication** via ALERT_API_KEY

Your dashboard now shows real-time alerts as they arrive! 🎉

