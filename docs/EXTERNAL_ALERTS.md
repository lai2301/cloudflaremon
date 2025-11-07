# External Alert Integration

Turn your Cloudflare Monitor into a centralized notification hub by receiving alerts from external monitoring tools like Prometheus Alertmanager, Grafana, and more.

## Table of Contents

- [Overview](#overview)
- [Supported Alert Sources](#supported-alert-sources)
- [API Endpoint](#api-endpoint)
- [Alert Formats](#alert-formats)
- [Integration Examples](#integration-examples)
- [Configuration](#configuration)
- [Testing](#testing)

## Overview

The `/api/alert` endpoint allows you to receive HTTP POST requests from external alerting tools and route them through your configured notification channels. This turns your worker into a unified notification hub where all your alerts flow through a single point.

### Use Cases

- Centralize notifications from multiple monitoring systems
- Unify alert formatting across different tools
- Add notification channels not supported by your monitoring tool
- Reduce integration complexity by managing notifications in one place

## Supported Alert Sources

### 1. Prometheus Alertmanager

Alertmanager is the standard alerting component for Prometheus.

**Detection**: Automatically detected when payload contains `alerts` array

**Webhook Configuration**: See [Alertmanager Integration](#alertmanager)

### 2. Grafana

Grafana alerting with webhook notifications.

**Detection**: Automatically detected when payload contains `evalMatches` or Grafana-specific fields

**Webhook Configuration**: See [Grafana Integration](#grafana)

### 3. Generic Format

A flexible format for custom integrations or unsupported tools.

**Detection**: When payload contains `title` and `message` fields

**Format**: See [Generic Format](#generic-format)

## API Endpoint

### POST `/api/alert`

Receive external alerts and route to notification channels.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ALERT_API_KEY  # Optional, required if ALERT_API_KEY is configured
```

**Authentication:**
- If `ALERT_API_KEY` environment variable is set, all requests must include the `Authorization` header
- If `ALERT_API_KEY` is not set, the endpoint is public (consider using Cloudflare Access or IP allowlisting)
- See [Security Considerations](#security-considerations) for recommended approaches

**Response:**
```json
{
  "success": true,
  "message": "Alert processed and notifications sent",
  "alertTitle": "High Memory Usage"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Unsupported alert format"
}
```

## Alert Formats

### Alertmanager Format

Alertmanager sends alerts in batches. The payload includes an array of alerts with labels and annotations.

**Example Payload:**

```json
{
  "receiver": "cloudflare-monitor",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighMemoryUsage",
        "severity": "critical",
        "instance": "server-01",
        "job": "node-exporter"
      },
      "annotations": {
        "summary": "High memory usage detected",
        "description": "Memory usage is above 90% on server-01"
      },
      "startsAt": "2025-11-06T10:30:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus:9090/graph?g0.expr=..."
    }
  ],
  "groupLabels": {
    "alertname": "HighMemoryUsage"
  },
  "commonLabels": {
    "alertname": "HighMemoryUsage",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "High memory usage detected"
  },
  "externalURL": "http://alertmanager:9093"
}
```

**Parsed Fields:**
- `title`: From `annotations.summary` or `labels.alertname`
- `message`: From `annotations.description` or `annotations.message`
- `severity`: From `labels.severity`
- `source`: Set to "alertmanager"
- `status`: "firing" or "resolved"
- `labels`: All alert labels
- `annotations`: All alert annotations

### Grafana Format

Grafana webhook notifications for alert rules.

**Example Payload:**

```json
{
  "dashboardId": 1,
  "evalMatches": [
    {
      "value": 95.5,
      "metric": "memory_usage_percent",
      "tags": {
        "host": "web-server-01"
      }
    }
  ],
  "imageUrl": "https://grafana.example.com/render/...",
  "message": "Memory usage is critically high",
  "orgId": 1,
  "panelId": 2,
  "ruleId": 1,
  "ruleName": "High Memory Alert",
  "ruleUrl": "https://grafana.example.com/alerting/...",
  "state": "alerting",
  "tags": {
    "severity": "critical"
  },
  "title": "High Memory Usage on web-server-01"
}
```

**Parsed Fields:**
- `title`: From `title` or `ruleName`
- `message`: From `message`
- `severity`: "critical" if state is "alerting", "info" if "ok", else "warning"
- `source`: Set to "grafana"
- `status`: From `state` field
- `labels`: Contains `ruleName` and `ruleUrl`

### Generic Format

A simple format for custom integrations.

**Example Payload:**

```json
{
  "title": "Database Connection Failed",
  "message": "Unable to connect to primary database server",
  "severity": "critical",
  "source": "my-app",
  "labels": {
    "environment": "production",
    "service": "api",
    "region": "us-east-1"
  },
  "annotations": {
    "runbook_url": "https://docs.example.com/runbooks/db-connection"
  }
}
```

**Required Fields:**
- `title` (string): Alert title
- `message` (string): Alert description

**Optional Fields:**
- `severity` (string): One of "critical", "error", "warning", "info" (default: "warning")
- `source` (string): Alert source identifier (default: "external")
- `labels` (object): Key-value pairs with additional context
- `annotations` (object): Additional metadata
- `channels` (array): Specific notification channels to use (e.g., `["discord", "slack"]`)

**Channel Routing:**

By default, alerts are routed to all enabled channels based on severity. You can override this by specifying channels:

```json
{
  "title": "Critical Database Issue",
  "message": "Primary database is down",
  "severity": "critical",
  "channels": ["pagerduty", "discord"]
}
```

This will send the alert **only** to PagerDuty and Discord, regardless of the global configuration.

## Integration Examples

### Channel Routing Examples

**Route critical alerts to PagerDuty only:**
```bash
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Database Down",
    "message": "Cannot connect to primary database",
    "severity": "critical",
    "channels": ["pagerduty"]
  }'
```

**Route warnings to Slack and Discord:**
```bash
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High Memory Usage",
    "message": "Memory usage at 85%",
    "severity": "warning",
    "channels": ["slack", "discord"]
  }'
```

**Send to all enabled channels (default behavior):**
```bash
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Alert",
    "message": "Something needs attention",
    "severity": "warning"
  }'
```

### Alertmanager

Add to your `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'cloudflare-monitor'

receivers:
  - name: 'cloudflare-monitor'
    webhook_configs:
      - url: 'https://your-worker.workers.dev/api/alert'
        send_resolved: true
        http_config:
          follow_redirects: true
```

**Routing to Specific Channels in Alertmanager:**

Add a `channels` label or annotation to your alert rules:

```yaml
# Example alert rules with channel routing
groups:
  - name: critical_alerts
    rules:
      - alert: DatabaseDown
        expr: up{job="database"} == 0
        for: 1m
        labels:
          severity: critical
          channels: "pagerduty,discord"  # Route to PagerDuty and Discord only
        annotations:
          summary: "Database is down"
          description: "Database {{ $labels.instance }} is not responding"
      
      - alert: HighMemory
        expr: memory_usage > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"
          channels: "slack"  # Route to Slack only
```

**Note:** Use a comma-separated string like `"discord,slack,pagerduty"`. The `channels` can be in either `labels` or `annotations`.

**Test with curl:**

```bash
# Default routing (based on severity)
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "cloudflare-monitor",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighCPU",
        "severity": "warning",
        "instance": "server-01"
      },
      "annotations": {
        "summary": "High CPU usage",
        "description": "CPU usage is above 80%"
      }
    }]
  }'

# With specific channels
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "cloudflare-monitor",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "CriticalError",
        "severity": "critical",
        "instance": "prod-01",
        "channels": "pagerduty,discord"
      },
      "annotations": {
        "summary": "Critical system error",
        "description": "System experiencing critical errors"
      }
    }]
  }'
```

### Grafana

1. Go to **Alerting** → **Contact points**
2. Click **New contact point**
3. Choose **Webhook** as the type
4. Set URL to `https://your-worker.workers.dev/api/alert`
5. Set HTTP Method to `POST`
6. Click **Test** to verify

**Routing to Specific Channels in Grafana:**

Add a `channels` tag to your alert rule:

1. In Grafana, go to your alert rule
2. Add a custom tag:
   - Key: `channels`
   - Value: `discord,slack` (comma-separated channel names)

**Example Alert Rule (YAML format):**

```yaml
groups:
  - name: system_alerts
    interval: 1m
    rules:
      - alert: HighMemory
        expr: (node_memory_Active_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"
      
      - alert: CriticalDatabaseError
        expr: db_errors_total > 100
        for: 1m
        labels:
          severity: critical
          channels: "pagerduty,discord"  # Route to PagerDuty and Discord only
        annotations:
          summary: "Critical database errors detected"
          description: "Error count: {{ $value }}"
```

**Note:** In Grafana's UI, add `channels` as a custom tag (not label) with comma-separated channel names.

### Generic Integration (curl example)

For custom applications or scripts:

```bash
#!/bin/bash

# Send custom alert (default routing)
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Backup Failed",
    "message": "Daily backup job failed on production database",
    "severity": "critical",
    "source": "backup-script",
    "labels": {
      "environment": "production",
      "service": "postgres",
      "backup_type": "daily"
    }
  }'

# Send to specific channels
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment Complete",
    "message": "Version 2.0.0 deployed successfully",
    "severity": "info",
    "source": "ci-cd",
    "channels": ["slack", "discord"]
  }'
```

### Python Example

```python
import requests
import json

def send_alert(title, message, severity='warning', source='python-app', channels=None, **labels):
    """Send custom alert to Cloudflare Monitor
    
    Args:
        title: Alert title
        message: Alert message
        severity: One of 'critical', 'error', 'warning', 'info'
        source: Source identifier
        channels: Optional list of channel names to route to (e.g. ['discord', 'slack'])
        **labels: Additional key-value labels
    """
    
    alert = {
        'title': title,
        'message': message,
        'severity': severity,
        'source': source,
        'labels': labels
    }
    
    # Add channels if specified
    if channels:
        alert['channels'] = channels
    
    response = requests.post(
        'https://your-worker.workers.dev/api/alert',
        headers={'Content-Type': 'application/json'},
        json=alert
    )
    
    return response.json()

# Usage - default routing (based on severity)
result = send_alert(
    title='High Error Rate',
    message='Application error rate exceeded threshold',
    severity='critical',
    source='api-monitor',
    service='user-api',
    environment='production',
    error_rate='15.2%'
)

# Usage - specific channels
result = send_alert(
    title='Deployment Successful',
    message='Version 2.0.0 deployed to production',
    severity='info',
    source='ci-cd',
    channels=['slack', 'discord'],  # Only send to Slack and Discord
    version='2.0.0',
    environment='production'
)

print(result)
```

### Node.js Example

```javascript
const axios = require('axios');

async function sendAlert({ 
  title, 
  message, 
  severity = 'warning', 
  source = 'nodejs-app', 
  channels = null,
  labels = {} 
}) {
  try {
    const payload = {
      title,
      message,
      severity,
      source,
      labels
    };
    
    // Add channels if specified
    if (channels && channels.length > 0) {
      payload.channels = channels;
    }
    
    const response = await axios.post(
      'https://your-worker.workers.dev/api/alert',
      payload,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to send alert:', error.message);
    throw error;
  }
}

// Usage - default routing
sendAlert({
  title: 'Payment Processing Issue',
  message: 'Payment gateway responding slowly',
  severity: 'warning',
  source: 'payment-service',
  labels: {
    gateway: 'stripe',
    region: 'us-west-2',
    latency: '5000ms'
  }
}).then(result => {
  console.log('Alert sent:', result);
});

// Usage - specific channels
sendAlert({
  title: 'Critical Payment Failure',
  message: 'Payment gateway is completely down',
  severity: 'critical',
  source: 'payment-service',
  channels: ['pagerduty', 'discord'],  // Only send to PagerDuty and Discord
  labels: {
    gateway: 'stripe',
    region: 'us-west-2'
  }
}).then(result => {
  console.log('Alert sent:', result);
});
```

## Configuration

### Enable External Alerts

By default, all enabled notification channels will receive external alerts. To disable external alerts for specific channels, add to your `notifications.json`:

```json
{
  "channels": [
    {
      "type": "discord",
      "name": "Discord - Internal Only",
      "enabled": true,
      "config": {
        "externalAlerts": false
      },
      "events": ["down", "up", "degraded"]
    }
  ]
}
```

### Severity Mapping

External alert severities are mapped to internal event types for color coding:

| Severity | Event Type | Color |
|----------|-----------|-------|
| critical | down | 🔴 Red |
| error | down | 🔴 Red |
| warning | degraded | 🟡 Orange |
| info | up | 🟢 Green |
| ok | up | 🟢 Green |

### Filtering by Severity

Channels can filter alerts by severity using the `events` configuration:

```json
{
  "type": "pagerduty",
  "name": "PagerDuty - Critical Only",
  "enabled": true,
  "events": ["down"]
}
```

This will only receive alerts with severity "critical" or "error".

## Testing

### Test External Alert Integration

```bash
# Test with a simple generic alert
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "This is a test of the external alert system",
    "severity": "warning",
    "source": "manual-test"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Alert processed and notifications sent",
  "alertTitle": "Test Alert"
}
```

### Verify Notifications

Check your configured notification channels (Discord, Slack, etc.) to verify the alert was received and formatted correctly.

## Advanced Usage

### Rate Limiting

To prevent alert storms, consider implementing rate limiting in Alertmanager or your alerting tool:

**Alertmanager example:**
```yaml
route:
  group_by: ['alertname']
  group_wait: 30s        # Wait before sending first alert
  group_interval: 5m     # Wait before sending batch update
  repeat_interval: 4h    # Wait before repeating the same alert
```

### Alert Grouping

Multiple alerts in Alertmanager will be batched together. The worker shows the count of firing/resolved alerts:

```
🔥 Firing: 3 | ✅ Resolved: 1
```

### Custom Labels

Add custom labels to your alerts for better filtering and context:

```json
{
  "title": "Disk Space Low",
  "message": "Disk usage above 85%",
  "severity": "warning",
  "labels": {
    "environment": "production",
    "datacenter": "us-east-1",
    "team": "infrastructure",
    "priority": "high"
  }
}
```

These labels will be displayed in your notifications (Discord, Slack) as additional fields.

## Troubleshooting

### Alert Not Received

1. Check that `notifications.json` has `enabled: true`
2. Verify at least one channel is enabled with matching event types
3. Check worker logs for errors: `npx wrangler tail`
4. Test with a simple curl command first

### Wrong Format

If you receive "Unsupported alert format", ensure your payload matches one of the supported formats:
- Alertmanager: Must have `alerts` array
- Grafana: Must have `evalMatches` or `message`
- Generic: Must have `title` and `message`

### Missing Fields in Notifications

- For Alertmanager: Ensure `annotations.summary` and `annotations.description` are set in alert rules
- For Grafana: Ensure alert rule has a title and message
- For Generic: Include all optional fields for richer notifications

## Security Considerations

The `/api/alert` endpoint can receive alerts from anywhere, so proper security is essential. Choose the approach that fits your needs:

### 1. API Key Authentication (Recommended)

**Simple bearer token authentication - enabled by setting the `ALERT_API_KEY` secret.**

**Setup:**
```bash
# Generate a strong API key
openssl rand -base64 32

# Set it as a Cloudflare secret
npx wrangler secret put ALERT_API_KEY
# Paste the generated key
```

**Or via GitHub Actions:**
Add `ALERT_API_KEY` to your GitHub Secrets, and the deployment workflow will automatically configure it.

**Usage in Alertmanager:**
```yaml
receivers:
  - name: 'cloudflare-monitor'
    webhook_configs:
      - url: 'https://your-worker.workers.dev/api/alert'
        http_config:
          authorization:
            type: Bearer
            credentials: YOUR_ALERT_API_KEY
```

**Usage in Grafana:**
In your webhook contact point, add a custom header:
- Header: `Authorization`
- Value: `Bearer YOUR_ALERT_API_KEY`

**Usage with curl:**
```bash
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Authorization: Bearer YOUR_ALERT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Testing","severity":"info"}'
```

**Pros:**
- ✅ Simple to set up and use
- ✅ Supported by most monitoring tools
- ✅ Optional (no breaking changes if not configured)
- ✅ Easy to rotate (just update the secret)

**Cons:**
- ⚠️ Shared key (all sources use the same key)
- ⚠️ No per-source identification

### 2. Cloudflare Access

**Enterprise-grade access control using Cloudflare's Zero Trust platform.**

Protect specific routes with Cloudflare Access policies:
- https://developers.cloudflare.com/cloudflare-one/policies/access/

**Pros:**
- ✅ Integrated with identity providers (Google, GitHub, etc.)
- ✅ Service tokens for machine-to-machine
- ✅ Audit logs and analytics
- ✅ IP-based policies

**Cons:**
- ⚠️ Requires Cloudflare Zero Trust (free tier available)
- ⚠️ More complex setup

### 3. IP Allowlisting

**Restrict access to known IP addresses using Cloudflare Firewall Rules.**

Create a firewall rule to allow only your monitoring servers:

```
(http.request.uri.path eq "/api/alert" and ip.src ne YOUR_PROMETHEUS_IP and ip.src ne YOUR_GRAFANA_IP)
Then: Block
```

**Pros:**
- ✅ No application changes needed
- ✅ Very secure if IPs are static
- ✅ Easy to manage in Cloudflare dashboard

**Cons:**
- ⚠️ Requires static IPs
- ⚠️ Difficult with dynamic IPs or cloud environments
- ⚠️ Manual management of IP list

### 4. Mutual TLS (mTLS)

**For advanced use cases, implement client certificate authentication.**

Cloudflare supports mTLS for Workers:
- https://developers.cloudflare.com/cloudflare-one/identity/devices/mutual-tls-authentication/

**Pros:**
- ✅ Strongest security
- ✅ Per-client certificates
- ✅ Certificate rotation

**Cons:**
- ⚠️ Complex setup
- ⚠️ Certificate management overhead
- ⚠️ Requires enterprise plan

### 5. Webhook Signature Verification

**Some platforms support webhook signatures (future enhancement).**

For platforms that support HMAC signatures:
- Grafana: Can include custom headers with signatures
- Custom tools: Implement HMAC-SHA256 signing

This is not yet implemented but could be added in the future.

### Recommended Security Strategy

**For most users:**
1. **Set `ALERT_API_KEY`** for simple, effective protection
2. **Use HTTPS only** (already enforced by Cloudflare Workers)
3. **Rotate keys periodically** (every 3-6 months)
4. **Monitor logs** for unauthorized access attempts: `npx wrangler tail`

**For enterprise users:**
1. **Cloudflare Access** with service tokens
2. **IP allowlisting** as an additional layer
3. **Audit logs** to track all access

**For public/open scenarios:**
- If you want to receive alerts from public sources, keep the endpoint public
- Use notification channel filtering to control what gets alerted
- Monitor for abuse and implement rate limiting if needed

### If No Authentication is Configured

If `ALERT_API_KEY` is not set, the endpoint is public. This is acceptable if:
- ✅ Your worker URL is not publicly known
- ✅ You're behind a VPN or private network
- ✅ You use Cloudflare Access or IP allowlisting
- ✅ You're okay with the risk (monitoring systems are usually not critical attack vectors)

**Risks of public endpoint:**
- Someone could spam your notification channels
- Resource usage could increase
- Potential for alert fatigue from false alerts

**Mitigation even without auth:**
- Keep your worker URL private
- Monitor logs for suspicious activity
- Implement rate limiting in notifications (already built-in via cooldown)
- Use Cloudflare's DDoS protection (automatic)

## Next Steps

- [Configure Notifications](./NOTIFICATIONS.md)
- [Customize Templates](./NOTIFICATION_TEMPLATES.md)
- [Setup GitHub Secrets](./NOTIFICATION_CREDENTIALS.md)

## Related Documentation

- [Prometheus Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Grafana Alerting Webhooks](https://grafana.com/docs/grafana/latest/alerting/manage-notifications/webhook-notifier/)

