# Cloudflare Heartbeat Monitor

[![Deploy to Cloudflare Workers](https://github.com/your-username/cloudflaremon/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/cloudflaremon/actions/workflows/deploy.yml)

A push-based Cloudflare Worker heartbeat monitoring solution for internal network services. Your internal services send heartbeats TO the Cloudflare Worker, eliminating the need to expose your services to the public internet.

**📖 [View Full Documentation](docs/README.md)** | **🚀 [Quick Start Guide](docs/QUICKSTART.md)** | **🏗️ [Architecture](docs/ARCHITECTURE.md)** | **🔒 [Security Guide](docs/SECURITY.md)** | **🔔 [Notifications](docs/NOTIFICATIONS.md)** | **🌐 [External Alerts](docs/EXTERNAL_ALERTS.md)**

## Features

- 📤 **Push-Based Architecture**: Internal services send heartbeats to the worker (not vice versa)
- 🔒 **Zero Exposure**: No need to expose internal services publicly
- 📊 **Beautiful Dashboard**: Web-based UI to view service status in real-time with 90-day uptime history
- 💾 **Ultra-Efficient Storage**: Single KV entry for all monitoring data
- ⚡ **Fast & Reliable**: Leverages Cloudflare's global network
- 🔐 **API Key Authentication**: Secure heartbeat endpoints with unified JSON secret
- ⏱️ **Staleness Detection**: Automatically detects when services stop sending heartbeats
- 🔔 **Multi-Channel Notifications**: Discord, Slack, Telegram, Email, PagerDuty, Pushover & more
- 🌐 **External Alert Integration**: Receive alerts from Prometheus Alertmanager, Grafana, and other tools
- 🎨 **Modern UI**: Uptimeflare-inspired design with dark mode support
- 📦 **Multiple Client Examples**: Bash, Python, Node.js, systemd, cron, Docker

## How It Works

This is a **push-based** monitoring system:

1. Internal services run a lightweight heartbeat client (provided in `examples/`)
2. The client periodically sends a POST request to the Cloudflare Worker
3. The worker receives and logs the heartbeat in Cloudflare KV storage
4. A scheduled task checks for "stale" heartbeats (services that stopped reporting)
5. A dashboard displays the current status based on heartbeat freshness

**Key Advantage**: Your internal services NEVER need to be exposed to the internet. Only outbound HTTPS requests are required.

## Setup Instructions

### 1. Prerequisites

- A Cloudflare account
- Node.js v20 or higher and npm installed
- Wrangler CLI (Cloudflare Workers CLI)

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy (KV Namespace Auto-Created!)

**No need to create KV namespace manually!** The GitHub Actions workflow handles this automatically using Terraform.

#### Option A: GitHub Actions (Recommended - Zero Setup)

Just push your code:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

The workflow will:
1. ✅ Create KV namespace via Terraform
2. ✅ Update `wrangler.toml` automatically  
3. ✅ Commit the changes
4. ✅ Deploy the worker

**That's it!** No manual KV namespace creation needed.

<details>
<summary>💡 Option B: Manual Local Setup (for testing before GitHub)</summary>

Only needed if you want to test locally first:

```bash
# Create KV namespace
npx wrangler kv:namespace create "HEARTBEAT_LOGS"

# Copy the ID from output and update wrangler.toml
# Replace YOUR_KV_NAMESPACE_ID_HERE with the actual ID

# Deploy manually
npm run deploy
```

</details>

### 4. Configure Your Services

Edit `services.json` to add your services to monitor:

```json
{
  "services": [
    {
      "id": "my-service",
      "name": "My API Service",
      "enabled": true,
      "stalenessThreshold": 300,
      "notifications": {
        "enabled": true,
        "channels": ["discord", "slack"],
        "events": ["down", "up"]
      }
    }
  ]
}
```

**Configuration Options:**

- `id`: Unique identifier for the service (used by heartbeat clients)
- `name`: Display name for the service
- `enabled`: Whether to monitor this service (true/false)
- `stalenessThreshold`: Time in seconds before considering a service "down" if no heartbeat received (default: 300)
- `notifications` (optional): Per-service notification settings
  - `enabled`: Enable/disable notifications for this service (default: true)
  - `channels`: Array of channel types to notify (e.g., `["discord", "slack"]`). If empty/omitted, uses all enabled channels
  - `events`: Array of events to notify on (e.g., `["down", "up"]`). If empty/omitted, uses channel's configured events

### 5. 🔒 Configure API Keys (Recommended)

**IMPORTANT:** Never store API keys in your repository! Use **one secret** containing all keys.

Set API keys as a single Cloudflare Worker secret named `API_KEYS` (JSON format):

```bash
# Using Wrangler CLI
npx wrangler secret put API_KEYS
# Then paste: {"service-1":"your-key-1","service-2":"your-key-2"}

# Or add to GitHub Secrets for CI/CD
# Settings → Secrets and variables → Actions → New secret
# Name: API_KEYS
# Value: {"service-1":"your-key-1","service-2":"your-key-2"}
```

**📖 See [Security Guide](docs/SECURITY.md) for detailed setup instructions**

### 6. 🔔 Configure Notifications (Optional)

Enable alerts when services go down or recover. 

#### Step 1: Edit `notifications.json`

```json
{
  "enabled": true,
  "channels": [
    {
      "type": "discord",
      "name": "Discord Alerts",
      "enabled": true,
      "config": {},
      "events": ["down", "up"]
    }
  ],
  "settings": {
    "cooldownMinutes": 5
  }
}
```

**Note**: Keep `config: {}` empty - credentials are stored as environment variables for security.

#### Step 2: Set Credentials as Environment Variables

```bash
# Set Discord webhook URL as a secret
npx wrangler secret put NOTIFICATION_DISCORD_ALERTS_WEBHOOKURL
# Then paste your webhook URL when prompted
```

**Environment Variable Naming**: `NOTIFICATION_{CHANNEL_NAME}_{CREDENTIAL_KEY}`

**Supported Channels:**
- 🎮 **Discord** - Rich embedded messages with color coding
- 💬 **Slack** - Formatted attachments and real-time updates
- 📱 **Telegram** - Instant mobile notifications via bot
- 📧 **Email** - Via Mailgun API (multiple recipients)
- 🔗 **Custom Webhook** - Send to any HTTP endpoint with custom headers
- 📲 **Pushover** - Mobile push notifications with priorities
- 🚨 **PagerDuty** - Incident management with auto-resolve

**Event Types:**
- `down` - Service stopped sending heartbeats
- `up` - Service recovered and is operational
- `degraded` - Service is partially operational

**📖 Documentation:**
- **[Notification Setup Guide](docs/NOTIFICATIONS.md)** - Detailed setup for each channel
- **[Template Customization](docs/NOTIFICATION_TEMPLATES.md)** 🎨 - Customize notification messages
- **[Credential Management](docs/NOTIFICATION_CREDENTIALS.md)** 🔒 - How to securely store API keys and tokens

### 7. Deploy the Worker

#### Option A: Deploy Manually

```bash
npm run deploy
```

Your worker will be deployed to Cloudflare's network!

#### Option B: Deploy via GitHub Actions (Recommended)

Set up automated deployment with GitHub Actions:

1. **Add required secrets to your GitHub repository:**
   
   **Required:**
   - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard → API Tokens
   - `API_KEYS` - JSON object with service API keys: `{"service-1":"key1","service-2":"key2"}`
   
   **Optional (for notifications):**
   - `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` - Discord webhook URL
   - `NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL` - Slack webhook URL
   - `NOTIFICATION_TELEGRAM_BOT_BOTTOKEN` & `NOTIFICATION_TELEGRAM_BOT_CHATID` - Telegram credentials
   - See [Notification Credentials Guide](docs/NOTIFICATION_CREDENTIALS.md) for complete list

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Automatic deployment** will trigger on every push to `main`!
   - Worker is deployed
   - All secrets are automatically configured
   - Notifications are ready to use

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed setup instructions.

## Usage

### 1. Deploy the Worker

Deploy the worker first:

```bash
npm run deploy
```

Your worker will be available at: `https://heartbeat-monitor.your-subdomain.workers.dev`

### 2. Set Up Heartbeat Clients

Choose a client script from the `examples/` directory and configure it on your internal services.

#### Option A: Using Bash Script

1. Copy `examples/heartbeat-client.sh` to your server
2. Edit the configuration variables (WORKER_URL, SERVICE_ID, API_KEY)
3. Make it executable: `chmod +x heartbeat-client.sh`
4. Test it: `./heartbeat-client.sh`
5. Schedule it with cron (see `examples/crontab.example`)

#### Option B: Using Python Script

1. Copy `examples/heartbeat-client.py` to your server
2. Edit the configuration variables
3. Make it executable: `chmod +x heartbeat-client.py`
4. Install requests: `pip install requests`
5. Schedule with cron or systemd timer

#### Option C: Using Node.js Script

1. Copy `examples/heartbeat-client.js` to your server
2. Edit the configuration variables
3. Make it executable: `chmod +x heartbeat-client.js`
4. Schedule with cron or systemd timer

#### Option D: Using systemd Timer (Recommended for Linux)

1. Copy `examples/systemd/heartbeat.service` to `/etc/systemd/system/`
2. Copy `examples/systemd/heartbeat.timer` to `/etc/systemd/system/`
3. Edit service file to point to your heartbeat script
4. Enable and start:
```bash
sudo systemctl enable heartbeat.timer
sudo systemctl start heartbeat.timer
sudo systemctl status heartbeat.timer
```

#### Option E: Using Docker

See `examples/docker-compose.yml` for a containerized heartbeat sender.

### 3. Access the Dashboard

After your services start sending heartbeats, access the dashboard at:

```
https://heartbeat-monitor.your-subdomain.workers.dev
```

The dashboard shows:
- Total number of monitored services
- Count of services that are up, down, or unknown
- Detailed status for each service
- Last heartbeat timestamp
- Time since last heartbeat

### API Endpoints

#### Send Heartbeat (POST)
```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "serviceId": "service-1",
    "status": "up",
    "metadata": {
      "hostname": "server-1",
      "custom_field": "value"
    },
    "message": "Optional status message"
  }'
```

**Request Body:**
- `serviceId` (required): Must match an ID in `services.json`
- `status` (optional): Service status, default "up"
- `metadata` (optional): Any additional data you want to track
- `message` (optional): Human-readable status message

#### Get Current Status
```
GET /api/status
```

Returns the latest summary of all service checks.

#### Get Service Logs
```
GET /api/logs?serviceId=service-1
```

Returns historical logs for a specific service (up to `MAX_LOG_ENTRIES`).

#### List Configured Services
```
GET /api/services
```

Returns the list of configured services from `services.json`.

#### External Alert Integration (POST)
```bash
curl -X POST https://your-worker.workers.dev/api/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High Memory Usage",
    "message": "Memory usage exceeded 90%",
    "severity": "critical",
    "source": "alertmanager"
  }'
```

**NEW!** Receive alerts from external monitoring tools like Prometheus Alertmanager, Grafana, and more. This endpoint automatically detects the alert format and routes it through your configured notification channels.

**Supported Formats:**
- Prometheus Alertmanager webhooks
- Grafana webhook notifications
- Generic format (title, message, severity)

**Request Body (Generic):**
- `title` (required): Alert title
- `message` (required): Alert description
- `severity` (optional): "critical", "error", "warning", or "info" (default: "warning")
- `source` (optional): Alert source identifier (default: "external")
- `labels` (optional): Additional key-value metadata
- `annotations` (optional): Additional annotations

**📖 See [External Alert Integration Guide](docs/EXTERNAL_ALERTS.md) for detailed integration examples with Alertmanager, Grafana, and custom scripts.**

**Security:** The `/api/alert` endpoint supports optional API key authentication. Set `ALERT_API_KEY` as a Cloudflare secret to require authentication:

```bash
# Generate a strong API key
openssl rand -base64 32

# Set it as a secret
npx wrangler secret put ALERT_API_KEY

# Or add to GitHub Secrets and it will be auto-configured on deploy
```

If `ALERT_API_KEY` is not configured, the endpoint is public. See [Security Considerations](docs/EXTERNAL_ALERTS.md#security-considerations) for alternative protection methods.

### Scheduled Staleness Checks

The worker automatically checks for stale heartbeats based on the cron schedule in `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

This scheduled task:
- Checks when each service last sent a heartbeat
- Marks services as "down" if they exceed their `stalenessThreshold`
- Updates the summary and status dashboard

**Recommended Setup:**
- Heartbeat clients send every 2 minutes
- Staleness threshold set to 5 minutes (300 seconds)
- Worker checks staleness every 5 minutes

## Development

### Local Development

Run the worker locally:

```bash
npm run dev
```

This starts a local development server. Note that cron triggers don't work in local development, but you can manually test by accessing the endpoints.

### View Logs

Tail worker logs in real-time:

```bash
npm run tail
```

## Configuration Variables

Edit these in `wrangler.toml`:

- `MAX_LOG_ENTRIES`: Maximum number of log entries to keep per service (default: 100)
- `REQUEST_TIMEOUT`: Default request timeout in milliseconds (default: 10000)

## Architecture Benefits

### Why Push-Based?

Traditional monitoring requires exposing services or creating inbound firewall rules. This push-based approach:

1. **Zero Inbound Exposure**: Services only need outbound HTTPS (port 443) access
2. **Firewall Friendly**: Works through corporate firewalls and NAT
3. **Simple Setup**: No VPN, tunnels, or port forwarding required
4. **Flexible Deployment**: Works with any service that can run a script or make HTTP requests

### Security Considerations

- **API Keys**: Each service can have its own API key for authentication
- **Outbound Only**: Services only make outbound HTTPS requests to Cloudflare
- **No Exposure**: Your internal services remain completely private
- **KV Storage**: All data stored in Cloudflare's encrypted KV storage

### Network Requirements

Your internal services only need:
- Outbound HTTPS access (port 443) to `*.workers.dev`
- Ability to run a scheduled script (cron, systemd, or similar)
- No inbound ports or public IPs required

## Data Storage

### KV Storage Structure

- `heartbeats:{serviceId}`: Array of recent heartbeats from each service (up to 100)
- `latest:{serviceId}`: Timestamp of the most recent heartbeat from each service
- `logs:{serviceId}`: Array of staleness check results for each service
- `summary:latest`: Latest summary of all service statuses
- `summary:history`: Historical summaries (up to 1000 entries)

### Data Retention

- Service logs: Last `MAX_LOG_ENTRIES` (default: 100) per service
- Summary history: Last 1000 summaries

## Troubleshooting

### Services showing as "Unknown"

This means no heartbeat has been received yet. Check:
- Is the heartbeat client script running?
- Are the WORKER_URL, SERVICE_ID, and API_KEY configured correctly?
- Can the service reach `*.workers.dev` over HTTPS?
- Check the heartbeat client logs for errors

### "Invalid API key" errors

- Verify the API key in your heartbeat client matches the one in `services.json`
- API keys are case-sensitive
- Ensure the Authorization header format is: `Bearer your-api-key`

### Services showing as "Down" but they're running

- Check if heartbeats are being sent frequently enough
- Verify the `stalenessThreshold` in `services.json` is appropriate
- The threshold should be at least 2-3x your heartbeat interval
- Example: If sending heartbeats every 2 minutes, threshold should be 5+ minutes (300+ seconds)

### KV namespace errors

- Verify the KV namespace ID in `wrangler.toml` is correct
- Ensure you've created the KV namespace: `npx wrangler kv:namespace create "HEARTBEAT_LOGS"`
- Check that the binding name matches (`HEARTBEAT_LOGS`)

### No data in dashboard

- Wait for the first heartbeat to be sent
- Wait for the first cron trigger to run (up to 5 minutes)
- Check worker logs: `npm run tail`
- Test heartbeat manually with curl (see API Endpoints section)

### Debugging Heartbeat Clients

Test your heartbeat client manually:

```bash
# Bash
./heartbeat-client.sh

# Python
python3 heartbeat-client.py

# Node.js
node heartbeat-client.js
```

Check the response for any error messages.

## Cost Estimation

Cloudflare Workers pricing:
- **Free tier**: 100,000 requests/day
- **Paid tier**: $5/month for 10 million requests

With 2-minute heartbeat intervals and 10 services:
- Heartbeat requests per day: 7,200 (720 per service)
- Dashboard/API requests: ~1,000
- Total: ~8,200 requests/day
- **Well within free tier**

KV storage:
- **Free tier**: 100,000 reads/day, 1,000 writes/day, 1GB storage
- Heartbeat writes per day: 7,200
- KV reads (dashboard access): varies
- **Well within free tier for up to 100 services**

The push-based architecture is very cost-effective!

## Security Considerations

### 🔒 API Keys (Recommended)

**IMPORTANT:** API keys are stored as **one secret** in JSON format, NOT in your repository.

- **Always use API keys** in production (set as Cloudflare Worker secret)
- **Never commit API keys** to your repository
- Generate strong, unique API keys for each service (use `openssl rand -base64 32`)
- Store all keys in one `API_KEYS` secret as JSON
- Rotate API keys periodically (every 90 days recommended)
- Easy to add new services - just update the JSON

**📖 Full setup guide:** [Security Documentation](docs/SECURITY.md)

**Quick setup:**
```bash
# Generate strong API keys
openssl rand -base64 32  # For service-1
openssl rand -base64 32  # For service-2

# Set them as one Cloudflare secret
npx wrangler secret put API_KEYS
# Paste: {"service-1":"key1","service-2":"key2"}
```

### Dashboard Access

- The dashboard is publicly accessible by default
- Consider using Cloudflare Access to restrict dashboard access
- No sensitive data is displayed (only service names and status)
- API keys are never exposed through the dashboard or APIs

### Best Practices

1. **Use HTTPS only**: All heartbeat clients use HTTPS
2. **Use environment variables**: Never hardcode secrets in code or config files
3. **Rotate secrets**: Periodically rotate API keys
4. **Monitor logs**: Use `npm run tail` to monitor for suspicious activity
5. **Limit metadata**: Don't send sensitive data in heartbeat metadata
6. **Firewall rules**: Restrict outbound access to only `*.workers.dev` if possible

### Data Privacy

- Service IDs and names are stored in KV (non-sensitive)
- API keys are stored encrypted in Cloudflare Secrets
- No sensitive service data (URLs, IPs, credentials) is transmitted
- Heartbeat metadata is optional and controlled by you
- All data stored in Cloudflare's encrypted KV storage

## 📚 Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get started in 10 minutes
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and components
- **[Security Guide](docs/SECURITY.md)** - API key management and best practices 🔒
- **[Notification Guide](docs/NOTIFICATIONS.md)** - Multi-channel alerting setup 🔔
- **[External Alerts Integration](docs/EXTERNAL_ALERTS.md)** - Receive alerts from Alertmanager, Grafana, etc. 🌐
- **[Notification Templates](docs/NOTIFICATION_TEMPLATES.md)** - Customize notification messages 🎨
- **[Notification Credentials](docs/NOTIFICATION_CREDENTIALS.md)** - Secure credential storage 🔐
- **[GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md)** - Automated deployment & secrets 🤖
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Manual deployment guide
- **[Setup Checklist](docs/SETUP_CHECKLIST.md)** - Pre-deployment checklist
- **[Permissions Guide](docs/PERMISSIONS.md)** - GitHub Actions permissions
- **[Contributing Guide](.github/CONTRIBUTING.md)** - How to contribute
- **[Terraform Guide](terraform/README.md)** - Infrastructure as code
- **[Heartbeat Clients](examples/README.md)** - Client implementation examples
- **[Workflows Documentation](.github/workflows/README.md)** - CI/CD details

## License

MIT

## Support

For issues or questions:
- Check the documentation above
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Open an issue](https://github.com/your-username/cloudflaremon/issues)

---

**Happy Monitoring! 🚀**

