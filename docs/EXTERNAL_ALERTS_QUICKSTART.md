# External Alerts Quick Start Guide

Get started with the external alert integration in 5 minutes.

## Setup (Choose One)

### Option 1: Public Endpoint (Quick Start)

If you trust your network or just want to test:

```bash
# No setup needed! The endpoint works immediately
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "Testing",
    "severity": "info"
  }'
```

**⚠️ Warning:** Anyone who knows your worker URL can send alerts.

### Option 2: With API Key Authentication (Recommended)

Protect the endpoint with a simple API key:

```bash
# 1. Generate a strong API key
openssl rand -base64 32

# 2. Set it as a Cloudflare secret
npx wrangler secret put ALERT_API_KEY
# (paste the key when prompted)

# 3. Now all requests must include the key
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "Testing with auth",
    "severity": "info"
  }'
```

**✅ Recommended for production use!**

## Test the Integration

### Quick Test

```bash
# Without auth
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello","severity":"info"}'

# With auth
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello","severity":"info"}'
```

### Comprehensive Test Suite

```bash
# Run all tests (includes channel routing tests)
cd examples
./test-external-alert.sh https://your-worker.workers.dev YOUR_API_KEY

# Or with Python
python3 test-external-alert.py https://your-worker.workers.dev YOUR_API_KEY
```

## Channel Routing

By default, alerts are sent to all enabled channels based on severity. You can override this by specifying channels in the payload:

```bash
# Send to specific channels only
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical Database Issue",
    "message": "Primary database is down",
    "severity": "critical",
    "channels": ["pagerduty", "discord"]
  }'
```

This gives you fine-grained control over alert routing:
- Critical production issues → PagerDuty only
- Deployment notifications → Slack only
- Security alerts → Discord + Email
- etc.

## Integrate with Alertmanager

Add to your `alertmanager.yml`:

```yaml
receivers:
  - name: 'cloudflare-monitor'
    webhook_configs:
      - url: 'https://your-worker.workers.dev/api/alert'
        send_resolved: true
        http_config:
          # Optional: only if you set ALERT_API_KEY
          authorization:
            type: Bearer
            credentials: YOUR_API_KEY
```

## Integrate with Grafana

1. Go to **Alerting** → **Contact points**
2. Click **New contact point**
3. Select **Webhook**
4. URL: `https://your-worker.workers.dev/api/alert`
5. HTTP Method: **POST**
6. (Optional) If using API key:
   - Add custom HTTP header
   - Name: `Authorization`
   - Value: `Bearer YOUR_API_KEY`

## GitHub Actions Auto-Setup

If using GitHub Actions for deployment:

1. Add `ALERT_API_KEY` to your GitHub Secrets
2. Push to deploy
3. The workflow automatically configures the secret on your worker

```bash
# In GitHub → Settings → Secrets → Actions
# Add new secret:
# Name: ALERT_API_KEY
# Value: (your generated key from openssl rand -base64 32)
```

## What Gets Sent to Your Notification Channels?

The alert will be sent to all **enabled** notification channels configured in `notifications.json`:

- **Discord**: Embed with alert details
- **Slack**: Formatted message with fields
- **Telegram**: Markdown formatted message
- **Email**: Plain text email
- **PagerDuty**: Incident creation
- **Pushover**: Push notification
- **Custom Webhook**: Full JSON payload

### Severity Mapping

| Alert Severity | Notification Type | Color |
|---------------|-------------------|-------|
| critical, error | down | 🔴 Red |
| warning | degraded | 🟡 Orange |
| info, ok | up | 🟢 Green |

## Troubleshooting

### 401 Unauthorized

- Check that you're sending the `Authorization: Bearer YOUR_API_KEY` header
- Verify the API key matches what you set with `wrangler secret put ALERT_API_KEY`
- Keys are case-sensitive

### 400 Unsupported Format

- Ensure your JSON includes `title` and `message` fields at minimum
- For Alertmanager: must include `alerts` array
- For Grafana: must include `evalMatches` or Grafana-specific fields

### No Notifications Received

- Check that `notifications.json` has `enabled: true`
- Verify at least one channel is enabled
- Check the severity matches the channel's `events` configuration
- Run `npx wrangler tail` to see logs

### "Public endpoint" Warning

This is normal if you haven't set `ALERT_API_KEY`. It means the endpoint can be accessed without authentication. This is fine for testing or if you're using other protection methods (IP allowlisting, Cloudflare Access, etc.).

## Next Steps

- **[Full Integration Guide](./EXTERNAL_ALERTS.md)** - Detailed setup for all platforms
- **[Security Options](./EXTERNAL_ALERTS.md#security-considerations)** - Compare authentication methods
- **[Notification Setup](./NOTIFICATIONS.md)** - Configure notification channels
- **[Example Configs](../examples/)** - Complete Alertmanager and Grafana configurations

## Examples

### Python Script

```python
import requests

def send_alert(title, message, severity='warning'):
    response = requests.post(
        'https://your-worker.workers.dev/api/alert',
        headers={
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'  # Optional
        },
        json={
            'title': title,
            'message': message,
            'severity': severity,
            'source': 'my-script'
        }
    )
    return response.json()

# Usage
send_alert('Deployment Complete', 'v2.0.0 deployed successfully', 'info')
```

### Bash Script

```bash
#!/bin/bash
WORKER_URL="https://your-worker.workers.dev"
API_KEY="YOUR_API_KEY"  # Optional

send_alert() {
  local title="$1"
  local message="$2"
  local severity="${3:-warning}"
  
  curl -X POST "$WORKER_URL/api/alert" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"title\": \"$title\",
      \"message\": \"$message\",
      \"severity\": \"$severity\",
      \"source\": \"bash-script\"
    }"
}

# Usage
send_alert "Backup Complete" "Daily backup successful" "info"
```

## FAQ

**Q: Do I have to use API key authentication?**  
A: No, it's optional. Without `ALERT_API_KEY` set, the endpoint is public.

**Q: Can I use different keys for different sources?**  
A: Currently, `ALERT_API_KEY` is shared. For per-source auth, consider using Cloudflare Access with service tokens.

**Q: Will this work with my existing notifications setup?**  
A: Yes! External alerts use the same notification channels you've already configured.

**Q: Can I customize the alert format?**  
A: Yes, see [Notification Templates](./NOTIFICATION_TEMPLATES.md) to customize how alerts are displayed.

**Q: Does this cost extra?**  
A: No, it uses your existing Cloudflare Workers quota. External alerts are just HTTP requests to your worker.

---

**Need help?** Check the [Full External Alerts Guide](./EXTERNAL_ALERTS.md) or [open an issue](https://github.com/your-username/cloudflaremon/issues).

