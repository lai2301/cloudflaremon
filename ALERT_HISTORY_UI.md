# Alert History UI Feature

## 🎯 Overview

New "Alert History" button (🔔) next to the Export button that opens a modal to review all stored alerts with filtering capabilities.

---

## ✨ Features

### 1. **Alert History Button**
- Located next to Export CSV button
- Bell icon (🔔) for easy recognition
- Opens modal with all stored alerts

### 2. **Filter Options**
Filter alerts by:
- **All** - Show all alerts
- **🚨 Critical** - Only critical alerts
- **⚠️ Warning** - Only warning alerts
- **ℹ️ Info** - Only info alerts
- **💓 Service Status** - Only service status changes (heartbeat monitor)
- **📡 External** - Only external alerts (Grafana, Alertmanager, etc.)

### 3. **Alert Display**
Each alert shows:
- **Severity badge** - Color-coded (critical, warning, info)
- **Title** - Alert headline
- **Message** - Detailed description
- **Source** - Where the alert came from
  - 💓 Service Monitor (status changes)
  - 📡 External sources (Grafana, Alertmanager, custom)
- **Timestamp** - When the alert occurred

### 4. **Interactive Features**
- **Hover effects** - Alerts slide slightly on hover
- **Color coding** - Left border matches severity
  - Red: Critical
  - Yellow: Warning
  - Blue: Info
- **Scrollable** - View up to 1000 alerts
- **Keyboard support** - Press `Esc` to close
- **Click backdrop** - Close by clicking outside modal

---

## 🎨 UI Layout

### Button Location
```
┌────────────────────────────────────────────┐
│  Dashboard                     📊 🔔 🔄 🌙 │
│                           Export ▲ Refresh │
│                                   Alert    │
│                                   History  │
└────────────────────────────────────────────┘
```

### Modal View
```
┌─────────────────────────────────────────────────────────┐
│  📋 Alert History                                    ×  │
├─────────────────────────────────────────────────────────┤
│  [All] [🚨 Critical] [⚠️ Warning] [ℹ️ Info]            │
│  [💓 Service Status] [📡 External]                     │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐    │
│  │ 🚨 Service Down: Internal API         [CRITICAL]│    │
│  │                                                 │    │
│  │ Internal API is not responding. Last seen:     │    │
│  │ 11/8/2025, 3:45:12 PM                          │    │
│  │                                                 │    │
│  │ 💓 Service Monitor  🕐 11/8/2025, 3:45:12 PM  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ ⚠️ High CPU Usage                     [WARNING] │    │
│  │                                                 │    │
│  │ Server CPU usage at 95%                        │    │
│  │                                                 │    │
│  │ 📡 Grafana  🕐 11/8/2025, 3:30:45 PM          │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Details

### Files Modified
- **`src/index.js`**
  - Added `.alert-history-btn` CSS
  - Added modal CSS (`.alert-history-modal`, etc.)
  - Added HTML for button and modal
  - Added JavaScript functions:
    - `openAlertHistory()` - Opens modal and loads alerts
    - `closeAlertHistory()` - Closes modal
    - `loadAlertHistory()` - Fetches alerts from API
    - `filterAlerts(filter)` - Filters by severity or source
    - `renderAlertHistory()` - Renders alert list

### API Endpoint Used
```
GET /api/alerts/recent?limit=1000
```

**Response format:**
```json
{
  "success": true,
  "count": 87,
  "alerts": [
    {
      "id": "alert:1731085512000:abc123",
      "title": "Service Down: Internal API",
      "message": "Internal API is not responding...",
      "severity": "critical",
      "source": "heartbeat-monitor",
      "timestamp": "2025-11-08T15:45:12.000Z",
      "serviceId": "service-1",
      "status": "down"
    }
  ]
}
```

---

## 🎯 Usage

### Opening Alert History

**Method 1: Click button**
```
Click the 🔔 button in the top right
```

**Method 2: Programmatic (JavaScript console)**
```javascript
openAlertHistory();
```

### Filtering Alerts

**UI:** Click any filter button

**Programmatic:**
```javascript
filterAlerts('critical');  // Show only critical
filterAlerts('warning');   // Show only warnings
filterAlerts('info');      // Show only info
filterAlerts('heartbeat-monitor');  // Service status changes
filterAlerts('external');  // External alerts only
filterAlerts('all');       // Show all
```

### Closing Modal

**Method 1:** Click × button
**Method 2:** Click backdrop (outside modal)
**Method 3:** Press `Esc` key
**Method 4:** Programmatic:
```javascript
closeAlertHistory();
```

---

## 📊 Filter Logic

### Severity Filters (critical, warning, info)
```javascript
filteredAlerts = allAlerts.filter(alert => 
  alert.severity === currentFilter
);
```

### Source Filters

**Service Status (heartbeat-monitor):**
```javascript
filteredAlerts = allAlerts.filter(alert => 
  alert.source === 'heartbeat-monitor'
);
```

**External:**
```javascript
filteredAlerts = allAlerts.filter(alert => 
  alert.source !== 'heartbeat-monitor'
);
```

**All:**
```javascript
filteredAlerts = allAlerts;  // No filtering
```

---

## 🎨 Color Scheme

### Severity Colors

| Severity | Border | Badge (Light) | Badge (Dark) |
|----------|--------|---------------|--------------|
| Critical | `#ef4444` (red) | `#fee2e2` bg, `#991b1b` text | `#7f1d1d` bg, `#fecaca` text |
| Warning | `#f59e0b` (yellow) | `#fef3c7` bg, `#92400e` text | `#78350f` bg, `#fde68a` text |
| Info | `#3b82f6` (blue) | `#dbeafe` bg, `#1e40af` text | `#1e3a8a` bg, `#bfdbfe` text |

### Source Icons

| Source | Icon | Display Name |
|--------|------|--------------|
| `heartbeat-monitor` | 💓 | Service Monitor |
| `grafana` | 📡 | Grafana |
| `alertmanager` | 📡 | Alertmanager |
| Other | 📡 | External |

---

## 📱 Responsive Design

### Desktop
- Modal: 900px max width, 80vh max height
- Filters: Horizontal row with wrapping
- Alerts: Full-width items

### Mobile (< 768px)
- Modal: 95% width, 90vh max height
- Filters: Vertical stack (full width buttons)
- Alerts: Adjusted padding and font sizes

---

## 🔍 Example Use Cases

### Use Case 1: Review Recent Critical Issues
1. Click 🔔 button
2. Click "🚨 Critical" filter
3. Review all critical alerts
4. Identify patterns or recurring issues

### Use Case 2: Check Service Status Changes
1. Click 🔔 button
2. Click "💓 Service Status" filter
3. See all down/up/degraded events
4. Verify service reliability over time

### Use Case 3: Audit External Monitoring
1. Click 🔔 button
2. Click "📡 External" filter
3. Review alerts from Grafana, Alertmanager
4. Verify external monitoring is working

### Use Case 4: Review Specific Time Period
1. Click 🔔 button
2. Scroll through chronological list
3. Alerts sorted newest first
4. Check timestamps for specific events

---

## ⚡ Performance

### Load Time
- **Initial open:** < 500ms (fetches up to 1000 alerts)
- **Filter switching:** Instant (client-side)
- **Subsequent opens:** Re-fetches data (always fresh)

### Memory Usage
- **~300 bytes per alert**
- 1000 alerts = ~300 KB in memory
- Cleared when modal closes

### Network
- **Single API call** when opening
- **No pagination** (loads all at once for simplicity)
- **Cache:** None (always fresh data)

---

## 🐛 Troubleshooting

### Issue: Modal doesn't open

**Check:**
1. Browser console for errors
2. Button exists: `document.getElementById('alertHistoryBtn')`
3. API endpoint accessible: `curl https://mon.pipdor.com/api/alerts/recent`

### Issue: No alerts shown

**Possible causes:**
1. No alerts stored in KV
2. API endpoint not returning data
3. JavaScript error (check console)

**Debug:**
```javascript
// Check if alerts loaded
console.log(allAlerts);

// Manually fetch
fetch('/api/alerts/recent?limit=100')
  .then(r => r.json())
  .then(console.log);
```

### Issue: Filters not working

**Check:**
1. Browser console for errors
2. Filter buttons have correct `data-filter` attributes
3. `filterAlerts()` function defined

**Debug:**
```javascript
// Manually filter
filterAlerts('critical');
console.log('Current filter:', currentFilter);
```

### Issue: Modal won't close

**Try:**
1. Press `Esc` key
2. Click backdrop
3. Manually close: `closeAlertHistory()`

---

## 🚀 Future Enhancements (Ideas)

### Potential Features
- **Search** - Search alerts by title or message
- **Date range** - Filter by date range
- **Export** - Export filtered alerts to CSV
- **Mark as read** - Mark alerts as read/unread
- **Delete** - Delete individual alerts
- **Pagination** - Load alerts in pages for better performance
- **Auto-refresh** - Refresh alerts every N seconds
- **Real-time** - Show new alerts without reopening modal
- **Sort options** - Sort by severity, time, source
- **Alert details** - Expand alert for more info (if available)

---

## ✅ Summary

✨ **New alert history button** next to export
📋 **View all stored alerts** in one place
🔍 **Filter by severity and source**
🎨 **Beautiful color-coded UI**
📱 **Responsive design** for mobile
⚡ **Fast and efficient** client-side filtering
⌨️ **Keyboard support** (Esc to close)
🎯 **Easy to use** and intuitive

**Click the 🔔 button to try it out!** 🎉

