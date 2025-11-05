# Cloudflare Heartbeat Monitor

[![Deploy to Cloudflare Workers](https://github.com/your-username/cloudflaremon/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/cloudflaremon/actions/workflows/deploy.yml)

A push-based Cloudflare Worker heartbeat monitoring solution for internal network services. Your internal services send heartbeats TO the Cloudflare Worker, eliminating the need to expose your services to the public internet.

## Features

- 📤 **Push-Based Architecture**: Internal services send heartbeats to the worker (not vice versa)
- 🔒 **Zero Exposure**: No need to expose internal services publicly
- 📊 **Beautiful Dashboard**: Web-based UI to view service status in real-time
- 💾 **KV Storage**: All heartbeat logs stored in Cloudflare KV for historical tracking
- ⚡ **Fast & Reliable**: Leverages Cloudflare's global network
- 🔐 **API Key Authentication**: Secure heartbeat endpoints with per-service API keys
- ⏱️ **Staleness Detection**: Automatically detects when services stop sending heartbeats
- 🎨 **Modern UI**: Clean, responsive dashboard with auto-refresh
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

### 3. Create KV Namespace

Create a KV namespace for storing heartbeat logs:

```bash
npx wrangler kv:namespace create "HEARTBEAT_LOGS"
```

This will output a namespace ID. Copy this ID and update the `wrangler.toml` file:

```toml
[[kv_namespaces]]
binding = "HEARTBEAT_LOGS"
id = "your_actual_namespace_id_here"
```

For production, also create a preview namespace:

```bash
npx wrangler kv:namespace create "HEARTBEAT_LOGS" --preview
```

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
      "apiKey": "your-secure-api-key-here"
    }
  ]
}
```

**Configuration Options:**

- `id`: Unique identifier for the service (used by heartbeat clients)
- `name`: Display name for the service
- `enabled`: Whether to monitor this service (true/false)
- `stalenessThreshold`: Time in seconds before considering a service "down" if no heartbeat received (default: 300)
- `apiKey`: Optional API key for authentication (recommended for security)

### 5. Deploy the Worker

#### Option A: Deploy Manually

```bash
npm run deploy
```

Your worker will be deployed to Cloudflare's network!

#### Option B: Deploy via GitHub Actions (Recommended)

Set up automated deployment with GitHub Actions:

1. **Add secrets to your GitHub repository:**
   - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare Dashboard → Workers

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Automatic deployment** will trigger on every push to `main`!

See [`.github/DEPLOYMENT.md`](.github/DEPLOYMENT.md) for detailed setup instructions.

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

### API Keys

- **Always use API keys** in production (`apiKey` field in `services.json`)
- Generate strong, unique API keys for each service
- Rotate API keys periodically
- Keep API keys secure (don't commit to git if `services.json` contains real keys)

### Dashboard Access

- The dashboard is publicly accessible by default
- Consider using Cloudflare Access to restrict dashboard access
- No sensitive data is displayed (only service names and status)
- For added security, implement basic authentication in the worker

### Best Practices

1. **Use HTTPS only**: All heartbeat clients use HTTPS
2. **Rotate secrets**: Periodically rotate API keys
3. **Monitor logs**: Use `npm run tail` to monitor for suspicious activity
4. **Limit metadata**: Don't send sensitive data in heartbeat metadata
5. **Firewall rules**: Restrict outbound access to only `*.workers.dev` if possible

### Data Privacy

- Service IDs and names are stored in KV
- No sensitive service data (URLs, IPs, credentials) is transmitted
- Heartbeat metadata is optional and controlled by you
- All data stored in Cloudflare's encrypted KV storage

## License

MIT

## Support

For issues or questions:
- Check Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Cloudflare KV documentation: https://developers.cloudflare.com/kv/

---

**Happy Monitoring! 🚀**

