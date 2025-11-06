# Notification System Guide

## 🔔 Overview

The heartbeat monitor includes a comprehensive notification system that alerts you when services go down, come back up, or become degraded.

**🔒 Security Note**: All sensitive credentials (API keys, webhook URLs, tokens) should be stored as **Cloudflare Worker environment variables**, NOT in `notifications.json`. See the **[Credential Management Guide](NOTIFICATION_CREDENTIALS.md)** for setup instructions.

## Supported Notification Channels

### 1. **Discord** 🎮
- Rich embedded messages with color coding
- Perfect for team channels
- **Setup**: Create a webhook in your Discord server settings

### 2. **Slack** 💬
- Formatted messages with attachments
- Great for work teams
- **Setup**: Create an Incoming Webhook app

### 3. **Telegram** 📱
- Instant mobile notifications
- Markdown-formatted messages
- **Setup**: Create a bot with @BotFather and get chat ID

### 4. **Email** 📧
- Via Mailgun API
- Multiple recipients supported
- **Setup**: Sign up for Mailgun and get API credentials

### 5. **Custom Webhook** 🔗
- Send to any HTTP endpoint
- Customizable headers and payload
- **Setup**: Configure your endpoint URL

### 6. **Pushover** 📲
- Mobile push notifications
- Priority levels supported
- **Setup**: Create a Pushover application

### 7. **PagerDuty** 🚨
- Incident management integration
- Auto-resolve when service recovers
- **Setup**: Create a PagerDuty integration

## Configuration

### Per-Service Notification Settings

You can configure different notification channels for each service in `services.json`:

```json
{
  "services": [
    {
      "id": "critical-api",
      "name": "Critical Production API",
      "enabled": true,
      "stalenessThreshold": 300,
      "notifications": {
        "enabled": true,
        "channels": ["discord", "pagerduty", "slack"],
        "events": ["down", "up"]
      }
    },
    {
      "id": "dev-service",
      "name": "Development Service",
      "enabled": true,
      "stalenessThreshold": 600,
      "notifications": {
        "enabled": true,
        "channels": ["slack"],
        "events": ["down"]
      }
    },
    {
      "id": "internal-tool",
      "name": "Internal Tool",
      "enabled": true,
      "stalenessThreshold": 300,
      "notifications": {
        "enabled": false
      }
    }
  ]
}
```

**Per-Service Notification Options:**

- **`enabled`**: Enable/disable notifications for this specific service
  - `true` - Send notifications (default)
  - `false` - Never send notifications for this service
  
- **`channels`**: Array of channel types to use for this service
  - Example: `["discord", "pagerduty"]`
  - Only channels that are enabled in `notifications.json` will be used
  - If omitted or empty, uses all enabled channels from `notifications.json`
  
- **`events`**: Array of events to notify on for this service
  - Example: `["down", "up"]`
  - Must be a subset of events the channel supports
  - If omitted, uses the events configured for each channel in `notifications.json`

**Use Cases:**

1. **Critical Services** → PagerDuty + Discord + Slack
   ```json
   "notifications": {
     "channels": ["pagerduty", "discord", "slack"],
     "events": ["down", "up", "degraded"]
   }
   ```

2. **Development Services** → Slack only (no pages)
   ```json
   "notifications": {
     "channels": ["slack"],
     "events": ["down"]
   }
   ```

3. **Internal Tools** → Disable notifications
   ```json
   "notifications": {
     "enabled": false
   }
   ```

4. **Default Behavior** → Omit the notifications field entirely
   ```json
   {
     "id": "service",
     "name": "Service Name",
     "enabled": true,
     "stalenessThreshold": 300
   }
   ```
   This will use all enabled channels from `notifications.json`

### File: `notifications.json`

```json
{
  "enabled": true,
  "channels": [
    {
      "type": "discord",
      "name": "Discord Webhook",
      "enabled": true,
      "config": {
        "webhookUrl": "https://discord.com/api/webhooks/..."
      },
      "events": ["down", "up", "degraded"]
    }
  ],
  "settings": {
    "cooldownMinutes": 5,
    "repeatAlertMinutes": 60,
    "includeMetadata": true,
    "timezone": "UTC"
  }
}
```

### Configuration Options

#### Global Settings

- **`enabled`**: Master switch for all notifications (true/false)
- **`cooldownMinutes`**: Minimum time between alerts for the same service (default: 5)
- **`repeatAlertMinutes`**: Time before repeating alert if still down (default: 60)
- **`includeMetadata`**: Include additional service info (default: true)
- **`timezone`**: Timezone for timestamps (default: "UTC")

#### Channel Configuration

- **`type`**: Channel type (discord, slack, telegram, etc.)
- **`name`**: Friendly name for the channel
- **`enabled`**: Enable/disable this specific channel
- **`config`**: Channel-specific configuration
- **`events`**: Which events to send (["down", "up", "degraded"])

## Event Types

### **🔴 down**
- Service failed to send heartbeat within threshold
- Triggers when service becomes unreachable
- High priority alert

### **🟢 up**
- Service recovered and is now operational
- Sent when service transitions from down to up
- Recovery notification

### **🟡 degraded**
- Service is partially operational
- Can be used for performance issues
- Medium priority alert

## Setup Guide

### Discord Setup

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Copy the Webhook URL
5. Add to `notifications.json`:

```json
{
  "type": "discord",
  "name": "My Discord Channel",
  "enabled": true,
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/YOUR_WEBHOOK"
  },
  "events": ["down", "up"]
}
```

### Slack Setup

1. Go to https://api.slack.com/apps
2. Create a new app
3. Add "Incoming Webhooks" feature
4. Activate and create a new webhook
5. Add to `notifications.json`:

```json
{
  "type": "slack",
  "name": "Slack Alerts",
  "enabled": true,
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
  },
  "events": ["down", "up"]
}
```

### Telegram Setup

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Save the bot token
4. Add bot to your channel/group
5. Get chat ID (message @userinfobot or use getUpdates API)
6. Add to `notifications.json`:

```json
{
  "type": "telegram",
  "name": "Telegram Bot",
  "enabled": true,
  "config": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "events": ["down", "up", "degraded"]
}
```

### Email (Mailgun) Setup

1. Sign up at https://mailgun.com
2. Verify your domain
3. Get your API key from dashboard
4. Add to `notifications.json`:

```json
{
  "type": "email",
  "name": "Email Alerts",
  "enabled": true,
  "config": {
    "provider": "mailgun",
    "apiKey": "YOUR_MAILGUN_API_KEY",
    "domain": "your-domain.com",
    "from": "alerts@your-domain.com",
    "to": ["admin@example.com", "team@example.com"]
  },
  "events": ["down", "up"]
}
```

### Custom Webhook Setup

```json
{
  "type": "webhook",
  "name": "Custom Endpoint",
  "enabled": true,
  "config": {
    "url": "https://your-api.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN",
      "X-Custom-Header": "value"
    }
  },
  "events": ["down", "up", "degraded"]
}
```

**Payload format:**
```json
{
  "event": "down",
  "service": {
    "id": "service-1",
    "name": "Internal API",
    "status": "down"
  },
  "lastSeen": "2025-01-15T10:30:00Z",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

### Pushover Setup

1. Sign up at https://pushover.net
2. Create an application
3. Get your User Key and API Token
4. Add to `notifications.json`:

```json
{
  "type": "pushover",
  "name": "Pushover",
  "enabled": true,
  "config": {
    "userKey": "YOUR_USER_KEY",
    "apiToken": "YOUR_API_TOKEN"
  },
  "events": ["down", "up"]
}
```

### PagerDuty Setup

1. Go to PagerDuty → Services
2. Create or select a service
3. Add "Events API V2" integration
4. Copy the Integration Key
5. Add to `notifications.json`:

```json
{
  "type": "pagerduty",
  "name": "PagerDuty",
  "enabled": true,
  "config": {
    "routingKey": "YOUR_ROUTING_KEY"
  },
  "events": ["down", "up"]
}
```

## Notification Routing Logic

### How Channels Are Selected

The system uses a two-level filtering approach:

1. **Global Level** (`notifications.json`)
   - Defines all available notification channels
   - Each channel has `enabled` flag and `events` list
   - Only enabled channels are considered

2. **Service Level** (`services.json`)
   - Each service can override which channels to use
   - Service can specify `channels` array (channel types)
   - Service can specify `events` array (event types)
   - Service can disable notifications entirely

### Filtering Process

```
┌──────────────────────────────────────────┐
│ 1. Get all enabled channels from         │
│    notifications.json                    │
│    Result: [Discord, Slack, Telegram]    │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ 2. Filter by event type                  │
│    Event: "down"                         │
│    Result: [Discord, Slack, Telegram]    │
│    (all support "down" event)            │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ 3. Apply service-specific filters        │
│    Service channels: ["discord", "slack"]│
│    Result: [Discord, Slack]              │
│    (Telegram filtered out)               │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ 4. Check service event filter            │
│    Service events: ["down", "up"]        │
│    Event: "down"                         │
│    Result: Send to Discord, Slack ✓      │
└──────────────────────────────────────────┘
```

### Examples

**Scenario 1: Service with specific channels**
- Global: Discord✓, Slack✓, Telegram✓, PagerDuty✗ (disabled)
- Service: `"channels": ["discord", "pagerduty"]`
- Result: Only **Discord** (PagerDuty not enabled globally)

**Scenario 2: Service with event filtering**
- Global: Discord supports ["down", "up", "degraded"]
- Service: `"events": ["down"]`
- Event: "up"
- Result: **No notification** (event filtered by service)

**Scenario 3: Notifications disabled for service**
- Service: `"notifications": { "enabled": false }`
- Result: **No notifications** regardless of global config

**Scenario 4: No service-specific config**
- Service has no `notifications` field
- Result: Use **all enabled channels** from notifications.json

## How It Works

1. **Cron Job Runs** (every 10 minutes by default)
2. **Status Check** - Checks each service's heartbeat
3. **Status Comparison** - Compares with previous status
4. **Change Detection** - Detects if status changed
5. **Cooldown Check** - Ensures cooldown period passed
6. **Send Notifications** - Sends to all enabled channels
7. **State Storage** - Saves current status for next check

### Flow Diagram

```
Service Heartbeat Check
         ↓
Status: down (was: up)
         ↓
Status Changed? YES
         ↓
Cooldown Passed? YES
         ↓
Send to Discord ✓
Send to Slack ✓
Send to Telegram ✓
         ↓
Save New Status
```

## Best Practices

### 1. **Use Appropriate Cooldowns**
- Set cooldown to prevent spam
- Recommended: 5-10 minutes
- Adjust based on your needs

### 2. **Choose the Right Events**
- Critical services: Monitor all events (down, up, degraded)
- Non-critical: Only monitor down events
- Recovery notifications helpful for tracking fixes

### 3. **Multiple Channels**
- Use Discord/Slack for team awareness
- Use PagerDuty/Pushover for critical alerts
- Email for audit trail

### 4. **Test Your Configuration**
```bash
# Temporarily set low staleness threshold
# Stop a service heartbeat
# Wait for cron to run
# Verify notifications received
```

### 5. **Security**
- Keep webhook URLs and API keys secret
- Don't commit real credentials to git
- Use environment variables for sensitive data (future feature)

## Testing Notifications

### Using the Test Script

We provide convenient test scripts to verify your notification setup:

#### Bash Script
```bash
cd examples
./test-notification.sh
```

Edit the configuration variables in the script:
```bash
WORKER_URL="https://your-worker.workers.dev"
CHANNEL_TYPE="discord"  # discord, slack, telegram, etc.
EVENT_TYPE="down"       # down, up, degraded
```

#### Python Script
```bash
cd examples
./test-notification.py
```

Edit the configuration in the script:
```python
WORKER_URL = "https://your-worker.workers.dev"
CHANNEL_TYPE = "discord"
EVENT_TYPE = "down"
```

### Manual API Test

Send a POST request to test a specific channel:

```bash
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "channelType": "discord",
    "eventType": "down"
  }'
```

**Request Body:**
- `channelType` (required): Type of channel to test (discord, slack, telegram, etc.)
- `eventType` (optional): Event type to simulate (down, up, degraded). Default: "down"

**Response:**
```json
{
  "success": true,
  "message": "Test down notification sent to Discord Alerts",
  "channel": "Discord Alerts",
  "type": "discord",
  "event": "down"
}
```

### Testing Checklist

Before testing:
- ✅ Notification system is enabled in `notifications.json`
- ✅ Target channel is enabled
- ✅ Webhook URL or API credentials are configured
- ✅ Channel is configured to receive the event type you're testing
- ✅ Worker is deployed with latest `notifications.json`

After testing:
- ✅ Check the notification channel for the test message
- ✅ Verify the message format looks correct
- ✅ Confirm timestamps and service info are displayed
- ✅ Test different event types (down, up, degraded)

## Troubleshooting

### Notifications Not Sending

1. **Check if notifications are enabled**
   - `notifications.json` → `enabled: true`
   - Individual channel `enabled: true`

2. **Verify credentials**
   - Test webhook URLs manually
   - Check API keys are valid

3. **Check worker logs**
   ```bash
   npm run tail
   ```

4. **Verify status changes**
   - Notifications only sent on status change
   - Check cooldown hasn't blocked alert

### Testing Notifications

1. Enable a test channel
2. Set very short staleness threshold (60 seconds)
3. Stop sending heartbeats
4. Wait for cron job to run
5. Check if notification received

### Common Issues

**Discord webhook not working:**
- Verify webhook URL is complete
- Check server permissions

**Telegram not receiving:**
- Verify bot token is correct
- Ensure bot is in the channel
- Check chat ID format (can be negative for groups)

**Email not sending:**
- Verify Mailgun domain is verified
- Check API key has sending permissions
- Ensure "from" address is authorized

## Example Notification Messages

### Discord
```
🔴 Service DOWN: Internal API

Service **Internal API** is now **down**

Service ID: service-1
Status: DOWN
Last Seen: 2025-01-15 10:30:00
Timestamp: 2025-01-15 10:35:00

Cloudflare Heartbeat Monitor
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

## Advanced Configuration

### Per-Service Notifications (Future Feature)

Configure different channels for different services:
- Critical services → PagerDuty
- Dev services → Slack
- All services → Discord

### Custom Event Types (Future Feature)

Define custom events:
- `high_latency`
- `connection_errors`
- `rate_limit_exceeded`

## FAQ

**Q: Can I use multiple channels at once?**
A: Yes! Enable as many channels as you need.

**Q: How do I silence notifications temporarily?**
A: Set `enabled: false` in the main config or for specific channels.

**Q: What's the difference between cooldown and repeat?**
A: Cooldown prevents duplicate alerts for quick status flips. Repeat sends periodic reminders if service stays down.

**Q: Can I customize the message format?**
A: Currently no, but it's a planned feature. Use custom webhook for now.

**Q: Do notifications work in local development?**
A: Yes, but cron jobs don't run locally. Test by deploying to Cloudflare.

## Customizing Notification Templates

You can customize the message format for each notification channel! Edit the `templates` section in `notifications.json`:

```json
{
  "templates": {
    "discord": {
      "title": "{{emoji}} Service {{eventType}}: {{serviceName}}",
      "description": "Custom message here: {{serviceName}} is {{eventType}}",
      "fields": [
        {"name": "Custom Field", "value": "{{serviceId}}", "inline": true}
      ]
    }
  }
}
```

**Available variables:**
- `{{emoji}}` - Status emoji (🔴/🟢/🟡)
- `{{eventType}}` - Event type (DOWN/UP/DEGRADED)
- `{{serviceName}}` - Service name
- `{{serviceId}}` - Service ID
- `{{lastSeen}}` - Last heartbeat time
- `{{timestamp}}` - Current timestamp

**📖 [Full Template Customization Guide](NOTIFICATION_TEMPLATES.md)** - Examples and best practices

## Related Documentation

- **[Template Customization](NOTIFICATION_TEMPLATES.md)** 🎨 - Customize notification messages
- **[Credential Management](NOTIFICATION_CREDENTIALS.md)** 🔒 - How to securely store notification credentials
- **[Quick Reference](NOTIFICATIONS_QUICK_REFERENCE.md)** - Common configurations and troubleshooting
- **[Security Guide](SECURITY.md)** - API key management
- **[Main README](../README.md)** - Project overview

## Support

For issues or feature requests:
- Check the [credential management guide](NOTIFICATION_CREDENTIALS.md)
- Review [troubleshooting](#troubleshooting)
- Open an issue on GitHub

---

**Happy Monitoring! 🔔**

