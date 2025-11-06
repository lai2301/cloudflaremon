# Notification Template Customization

## 📝 Overview

You can customize notification messages for each channel by editing the `templates` section in `notifications.json`. Templates use `{{variable}}` placeholders that are automatically replaced with actual values.

## 🎨 Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{emoji}}` | Status emoji | 🔴 (down), 🟢 (up), 🟡 (degraded) |
| `{{eventType}}` | Event type (uppercase) | DOWN, UP, DEGRADED |
| `{{serviceName}}` | Service display name | Internal API |
| `{{serviceId}}` | Service identifier | service-1 |
| `{{lastSeen}}` | Last heartbeat timestamp | 2025-11-06 10:30:00 |
| `{{timestamp}}` | Current timestamp (localized) | 11/6/2025, 10:35:00 AM |
| `{{timestampISO}}` | Current timestamp (ISO format) | 2025-11-06T10:35:00.000Z |

## 📋 Template Structure

### Discord

```json
"discord": {
  "title": "{{emoji}} Service {{eventType}}: {{serviceName}}",
  "description": "Service **{{serviceName}}** is now **{{eventType}}**",
  "fields": [
    {"name": "Field Name", "value": "{{variable}}", "inline": true}
  ],
  "footer": "Your Footer Text"
}
```

**Example Output:**
```
🔴 Service DOWN: Internal API
Service **Internal API** is now **DOWN**

Service ID: service-1
Status: DOWN
Last Seen: 2025-11-06 10:30:00
```

### Slack

```json
"slack": {
  "text": "{{emoji}} Service Alert: {{serviceName}}",
  "fields": [
    {"title": "Field Title", "value": "{{variable}}", "short": true}
  ],
  "footer": "Your Footer Text"
}
```

**Example Output:**
```
:red_circle: Service Alert: Internal API

Service: Internal API | Status: DOWN
Service ID: service-1 | Last Seen: 2025-11-06 10:30:00
```

### Telegram

```json
"telegram": {
  "message": "{{emoji}} *Service {{eventType}}*\n\n*Service:* {{serviceName}}"
}
```

**Example Output:**
```
🔴 Service DOWN

Service: Internal API
Status: DOWN
Last Seen: 2025-11-06 10:30:00
```

### Email

```json
"email": {
  "subject": "[{{eventType}}] {{serviceName}} - Alert",
  "body": "Service: {{serviceName}}\nStatus: {{eventType}}"
}
```

**Example Output:**
```
Subject: [DOWN] Internal API - Alert

Service: Internal API
Status: DOWN
Service ID: service-1
```

### Pushover

```json
"pushover": {
  "title": "Alert: {{serviceName}}",
  "message": "Service {{serviceName}} is {{eventType}}"
}
```

### PagerDuty

```json
"pagerduty": {
  "summary": "Service {{serviceName}} is {{eventType}}",
  "severity": "critical"
}
```

**Severity options:** `critical`, `error`, `warning`, `info`

## 💡 Customization Examples

### Example 1: Minimal Discord Template

```json
"discord": {
  "title": "{{emoji}} {{serviceName}} - {{eventType}}",
  "description": "Status changed to {{eventType}}",
  "footer": "MyCompany Monitoring"
}
```

### Example 2: Detailed Slack Template

```json
"slack": {
  "text": "🚨 ALERT: {{serviceName}} {{eventType}}",
  "fields": [
    {"title": "Environment", "value": "Production", "short": true},
    {"title": "Service", "value": "{{serviceName}}", "short": true},
    {"title": "Current Status", "value": "{{eventType}}", "short": true},
    {"title": "Service ID", "value": "{{serviceId}}", "short": true},
    {"title": "Last Contact", "value": "{{lastSeen}}", "short": false},
    {"title": "Alert Time", "value": "{{timestamp}}", "short": false}
  ],
  "footer": "Production Monitoring | MyCompany"
}
```

### Example 3: Custom Telegram with Links

```json
"telegram": {
  "message": "{{emoji}} *ALERT: {{eventType}}*\n\n*Service:* {{serviceName}}\n*Status:* {{eventType}}\n*Last Heartbeat:* {{lastSeen}}\n\n[View Dashboard](https://mon.yourdomain.com)\n[View Logs](https://logs.yourdomain.com/{{serviceId}})"
}
```

### Example 4: Branded Email Template

```json
"email": {
  "subject": "⚠️ [{{eventType}}] {{serviceName}} Alert - MyCompany Monitoring",
  "body": "===================================\nMyCompany Service Alert\n===================================\n\nService Name: {{serviceName}}\nService ID: {{serviceId}}\nCurrent Status: {{eventType}}\nLast Heartbeat: {{lastSeen}}\nAlert Timestamp: {{timestamp}}\n\n---\nThis is an automated alert from MyCompany Monitoring System.\nFor support, contact: support@mycompany.com"
}
```

### Example 5: Simple Pushover

```json
"pushover": {
  "title": "🚨 {{serviceName}}",
  "message": "Status: {{eventType}} at {{timestamp}}"
}
```

## 🎯 Best Practices

### 1. Keep It Concise
Mobile notifications should be brief:
```json
"pushover": {
  "title": "{{serviceName}}",
  "message": "{{eventType}}"
}
```

### 2. Include Context
Team channels need more detail:
```json
"slack": {
  "text": "{{emoji}} Service {{serviceName}} is {{eventType}}",
  "fields": [
    {"title": "Service", "value": "{{serviceName}}", "short": true},
    {"title": "Environment", "value": "Production", "short": true},
    {"title": "Last Seen", "value": "{{lastSeen}}", "short": false}
  ]
}
```

### 3. Use Emojis Strategically
```json
{
  "title": "{{emoji}} {{serviceName}}",  // ✅ Good - emoji in title
  "description": "Service is {{eventType}}"  // ✅ Good - no redundant emoji
}
```

### 4. Format for Platform
- **Discord/Slack**: Use markdown (`**bold**`)
- **Telegram**: Use markdown (`*bold*`)
- **Email**: Plain text with clear sections
- **Pushover**: Keep very short

### 5. Include Actionable Information
```json
{
  "message": "{{serviceName}} is {{eventType}}\nLast seen: {{lastSeen}}\nInvestigate: https://dashboard.com/{{serviceId}}"
}
```

## 🔧 Testing Your Templates

After editing templates, test them:

```bash
# Test notification with your new template
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"discord","eventType":"down"}'
```

Or use the test script:
```bash
cd examples
./test-notification.sh
```

## 🚀 Deployment

### 1. Edit `notifications.json`

```json
{
  "templates": {
    "discord": {
      "title": "Your Custom Title Here",
      ...
    }
  }
}
```

### 2. Deploy

```bash
git add notifications.json
git commit -m "Customize notification templates"
git push origin main
```

### 3. Test

```bash
./examples/test-notification.sh
```

## 📚 Template Reference

### Discord Fields

```json
{
  "name": "Field Name",      // Field title
  "value": "Field Value",    // Field content (supports {{variables}})
  "inline": true             // Display inline (max 3 per row)
}
```

### Slack Fields

```json
{
  "title": "Field Title",    // Field title
  "value": "Field Value",    // Field content (supports {{variables}})
  "short": true              // Display side-by-side
}
```

### Markdown Support

| Platform | Markdown | Example |
|----------|----------|---------|
| Discord | ✅ Full | `**bold**`, `*italic*`, `__underline__` |
| Slack | ✅ Limited | `*bold*`, `_italic_`, `~strike~` |
| Telegram | ✅ Full | `*bold*`, `_italic_`, `` `code` `` |
| Email | ❌ None | Plain text only |
| Pushover | ❌ None | Plain text only |

## ⚠️ Common Mistakes

### 1. Typo in Variable Name
```json
// ❌ Wrong
"title": "{{servcieName}}"  // Typo

// ✅ Correct
"title": "{{serviceName}}"
```

### 2. Missing Closing Braces
```json
// ❌ Wrong
"title": "{{serviceName} is {{eventType}"

// ✅ Correct
"title": "{{serviceName}} is {{eventType}}"
```

### 3. Invalid JSON
```json
// ❌ Wrong - trailing comma
{
  "title": "Test",
}

// ✅ Correct
{
  "title": "Test"
}
```

## 💡 Pro Tips

### 1. Environment-Specific Templates
Use different notification channels for different environments:
- Production → PagerDuty (detailed template)
- Staging → Slack (minimal template)
- Development → Telegram (brief template)

### 2. Include Links
```json
{
  "message": "{{serviceName}} {{eventType}}\nDashboard: https://mon.yourdomain.com\nRunbook: https://wiki.yourdomain.com/runbooks/{{serviceId}}"
}
```

### 3. Add Context
```json
{
  "fields": [
    {"name": "Region", "value": "US-West", "inline": true},
    {"name": "Owner", "value": "@platform-team", "inline": true}
  ]
}
```

### 4. Use Footer for Branding
```json
{
  "footer": "MyCompany Monitoring | SLA: 99.9%"
}
```

## 🔍 Troubleshooting

### Template Not Working?

1. **Check JSON syntax**:
```bash
cat notifications.json | python3 -m json.tool
```

2. **Verify variable names**:
   - Use exactly: `{{emoji}}`, `{{eventType}}`, `{{serviceName}}`, `{{serviceId}}`, `{{lastSeen}}`, `{{timestamp}}`
   - Case-sensitive!

3. **Test the notification**:
```bash
./examples/test-notification.sh
```

4. **Check worker logs**:
```bash
npm run tail
```

### Variables Not Replaced?

- Make sure you're using `{{variable}}` not `{variable}` or `$variable`
- Check for typos in variable names
- Verify the template section exists in `notifications.json`

## 📖 Related Documentation

- [Notification Setup Guide](NOTIFICATIONS.md)
- [Credential Management](NOTIFICATION_CREDENTIALS.md)
- [Quick Reference](NOTIFICATIONS_QUICK_REFERENCE.md)

---

**🎨 Customize your notifications to match your team's needs!**

