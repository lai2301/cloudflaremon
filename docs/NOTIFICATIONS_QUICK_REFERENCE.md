# Notification System - Quick Reference

## 🚀 Quick Start

### 1. Enable Notifications
Edit `notifications.json`:
```json
{
  "enabled": true,
  "channels": [...]
}
```

### 2. Configure Per-Service Notifications (Optional)
Edit `services.json` to specify which channels each service uses:
```json
{
  "id": "critical-api",
  "name": "Critical API",
  "enabled": true,
  "stalenessThreshold": 300,
  "notifications": {
    "enabled": true,
    "channels": ["discord", "pagerduty"],
    "events": ["down", "up"]
  }
}
```

If omitted, service uses all enabled channels from `notifications.json`.

### 3. Configure a Channel
```json
{
  "type": "discord",
  "enabled": true,
  "config": {
    "webhookUrl": "YOUR_WEBHOOK_URL"
  },
  "events": ["down", "up"]
}
```

### 4. Deploy
```bash
npm run deploy
```

### 5. Test
```bash
cd examples
./test-notification.sh
```

## 📋 Supported Channels

| Channel | Type | Key Fields |
|---------|------|------------|
| 🎮 Discord | `discord` | `webhookUrl` |
| 💬 Slack | `slack` | `webhookUrl` |
| 📱 Telegram | `telegram` | `botToken`, `chatId` |
| 📧 Email | `email` | `apiKey`, `domain`, `from`, `to` |
| 🔗 Webhook | `webhook` | `url`, `headers` |
| 📲 Pushover | `pushover` | `userKey`, `apiToken` |
| 🚨 PagerDuty | `pagerduty` | `routingKey` |

## ⚙️ Event Types

| Event | Icon | Trigger |
|-------|------|---------|
| `down` | 🔴 | Service stopped sending heartbeats |
| `up` | 🟢 | Service recovered |
| `degraded` | 🟡 | Service partially operational |

## 🎯 Per-Service Configuration Examples

### Example 1: Critical Production Service
Route to PagerDuty, Discord, and Slack for critical services:

```json
{
  "id": "production-api",
  "name": "Production API",
  "enabled": true,
  "stalenessThreshold": 300,
  "notifications": {
    "enabled": true,
    "channels": ["pagerduty", "discord", "slack"],
    "events": ["down", "up", "degraded"]
  }
}
```

### Example 2: Development Service
Only notify Slack, no pages:

```json
{
  "id": "dev-api",
  "name": "Development API",
  "enabled": true,
  "stalenessThreshold": 600,
  "notifications": {
    "enabled": true,
    "channels": ["slack"],
    "events": ["down"]
  }
}
```

### Example 3: Internal Tool
Disable notifications completely:

```json
{
  "id": "internal-tool",
  "name": "Internal Tool",
  "enabled": true,
  "stalenessThreshold": 300,
  "notifications": {
    "enabled": false
  }
}
```

### Example 4: Default Behavior
Omit notifications field to use all enabled channels:

```json
{
  "id": "standard-service",
  "name": "Standard Service",
  "enabled": true,
  "stalenessThreshold": 300
}
```

## 🔧 Channel Configurations

### Discord Webhook
```json
{
  "type": "discord",
  "enabled": true,
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/ID/TOKEN"
  },
  "events": ["down", "up"]
}
```

**Get Webhook URL:**
1. Server Settings → Integrations → Webhooks
2. Create/Copy webhook URL

### Slack Webhook
```json
{
  "type": "slack",
  "enabled": true,
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/T00/B00/XXX"
  },
  "events": ["down", "up"]
}
```

**Get Webhook URL:**
1. https://api.slack.com/apps
2. Create app → Incoming Webhooks → Add New Webhook

### Telegram Bot
```json
{
  "type": "telegram",
  "enabled": true,
  "config": {
    "botToken": "123456:ABC-DEF",
    "chatId": "-1001234567890"
  },
  "events": ["down", "up", "degraded"]
}
```

**Setup:**
1. Message @BotFather → `/newbot`
2. Save bot token
3. Add bot to channel
4. Get chat ID from @userinfobot or API

### Email (Mailgun)
```json
{
  "type": "email",
  "enabled": true,
  "config": {
    "provider": "mailgun",
    "apiKey": "key-xxx",
    "domain": "mg.domain.com",
    "from": "alerts@domain.com",
    "to": ["admin@domain.com"]
  },
  "events": ["down", "up"]
}
```

### Custom Webhook
```json
{
  "type": "webhook",
  "enabled": true,
  "config": {
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer TOKEN"
    }
  },
  "events": ["down", "up", "degraded"]
}
```

**Payload:**
```json
{
  "event": "down",
  "service": {
    "id": "service-1",
    "name": "My API",
    "status": "down"
  },
  "lastSeen": "2025-01-15T10:30:00Z",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

## 🧪 Testing Commands

### Test Notification API
```bash
# Test Discord
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"discord","eventType":"down"}'

# Test Slack
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"slack","eventType":"up"}'

# Test Telegram
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"telegram","eventType":"degraded"}'
```

### Using Test Scripts
```bash
# Bash
cd examples
./test-notification.sh

# Python
cd examples
./test-notification.py
```

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| No notification received | Check channel `enabled: true` in both files |
| Invalid webhook error | Verify webhook URL is correct |
| Telegram not working | Confirm bot is in channel, check chat ID |
| Too many notifications | Increase `cooldownMinutes` |
| Missing notifications | Check event is in channel's `events` array |
| Service not sending to channel | Check service's `notifications.channels` array |
| Channel ignored for service | Ensure channel is enabled in `notifications.json` |
| All notifications silent | Check `notifications.enabled: false` in service config |

## ⚙️ Settings Reference

```json
{
  "settings": {
    "cooldownMinutes": 5,        // Min time between alerts (same service)
    "repeatAlertMinutes": 60,    // Time before repeating if still down
    "includeMetadata": true,     // Include extra service info
    "timezone": "UTC"            // Timezone for timestamps
  }
}
```

## 🔒 Security Best Practices

- ✅ Never commit webhook URLs/API keys to git
- ✅ Use `.gitignore` for `notifications.json` in production
- ✅ Consider storing sensitive configs as Cloudflare Secrets (future feature)
- ✅ Rotate webhook URLs periodically
- ✅ Use read-only webhook permissions when possible
- ✅ Monitor for unauthorized access in your channels

## 📊 Example Notification Flow

```
1. Service stops sending heartbeats
   ↓
2. Cron job detects staleness (every 5 min)
   ↓
3. Status changes: up → down
   ↓
4. Check cooldown (5 min passed?)
   ↓ YES
5. Get service notification config from services.json
   ↓
6. Filter channels based on service settings:
   - Global: Discord, Slack, Telegram (all enabled)
   - Service config: ["discord", "pagerduty"]
   - Final: Discord ✓ (PagerDuty not in global config)
   ↓
7. Send to filtered channels:
   - Discord ✓
   ↓
8. Update last alert time
   ↓
9. Save status to KV
```

### Per-Service Filtering Logic

```
┌─────────────────────────────────────┐
│  Global notifications.json          │
│  Channels: Discord✓ Slack✓ Telegram✓│
│  All enabled                         │
└────────────────┬────────────────────┘
                 │
         ┌───────▼────────┐
         │ Service Config │
         │ "channels":    │
         │ ["discord",    │
         │  "pagerduty"]  │
         └───────┬────────┘
                 │
         ┌───────▼────────────────┐
         │ Filter & Intersection  │
         │ Discord: ✓ (in both)   │
         │ Slack: ✗ (not in svc)  │
         │ Telegram: ✗ (not in svc)│
         │ PagerDuty: ✗ (not global)│
         └───────┬────────────────┘
                 │
         ┌───────▼────────┐
         │ Send to:       │
         │ - Discord ✓    │
         └────────────────┘
```

## 🎨 Notification Examples

### Discord
![Discord Example]
```
🔴 Service DOWN: Internal API

Service **Internal API** is now **down**

Service ID: service-1
Status: DOWN
Last Seen: 2025-01-15 10:30:00
Timestamp: 2025-01-15 10:35:00
```

### Slack
```
🔴 Service Alert: Internal API

Service: Internal API
Status: DOWN
Service ID: service-1
Last Seen: 2025-01-15 10:30:00
```

### Telegram
```
🔴 Service DOWN

Service: Internal API
Status: DOWN
Last Seen: 2025-01-15 10:30:00
Time: 1/15/2025, 10:35:00 AM
```

## 📚 Related Documentation

- **[Full Notification Guide](NOTIFICATIONS.md)** - Detailed setup for each channel
- **[Security Guide](SECURITY.md)** - API key management
- **[Architecture](ARCHITECTURE.md)** - How the system works

## 💡 Tips

1. **Start Simple**: Enable one channel (e.g., Discord) first
2. **Test Early**: Use test scripts before waiting for real alerts
3. **Use Per-Service Config**: Route critical services to PagerDuty, dev services to Slack only
4. **Default Behavior**: Omit `notifications` field in services.json to use all enabled channels
5. **Disable Selectively**: Set `notifications.enabled: false` for noisy/non-critical services
6. **Event Filtering**: Use `events: ["down"]` only for dev services to reduce noise on recovery
7. **Adjust Cooldown**: Prevent spam with appropriate cooldown times (5-10 minutes)
8. **Monitor Costs**: Most services have free tiers, but check rate limits
9. **Log Monitoring**: Check worker logs (`npm run tail`) to see which channels are being used
10. **Gradual Rollout**: Start with one service, test thoroughly, then expand

---

**Need Help?** Check the [full documentation](NOTIFICATIONS.md) or open an issue.

