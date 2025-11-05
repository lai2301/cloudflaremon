# Quick Start Guide

Get your Cloudflare Heartbeat Monitor running in 10 minutes!

## Prerequisites

- Node.js v20 or higher ([Download](https://nodejs.org/))
- A Cloudflare account
- Git (optional, for version control)

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Create KV Namespace (1 min)

```bash
npx wrangler kv:namespace create "HEARTBEAT_LOGS"
```

Copy the namespace ID from the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "HEARTBEAT_LOGS"
id = "your_namespace_id_here"  # Paste your ID here
```

## Step 3: Configure Services (2 min)

Edit `services.json`:

```json
{
  "services": [
    {
      "id": "my-api",
      "name": "My API Server",
      "enabled": true,
      "stalenessThreshold": 300,
      "apiKey": "super-secret-key-123"
    }
  ]
}
```

**Generate a strong API key**: `openssl rand -hex 32`

## Step 4: Deploy Worker (1 min)

### Option A: Deploy Manually

```bash
npm run deploy
```

Note the worker URL from the output (e.g., `https://heartbeat-monitor.your-subdomain.workers.dev`)

### Option B: Deploy via GitHub Actions

1. Add secrets to GitHub: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
2. Push to GitHub: `git push origin main`
3. Deployment happens automatically!

See [`.github/DEPLOYMENT.md`](.github/DEPLOYMENT.md) for full instructions.

## Step 5: Set Up Heartbeat Client (5 min)

### Option A: Bash (Simplest)

1. Copy the bash script to your server:

```bash
# Download the script
curl -o heartbeat-client.sh https://raw.githubusercontent.com/.../heartbeat-client.sh
chmod +x heartbeat-client.sh
```

2. Edit the script with your values:

```bash
vim heartbeat-client.sh
# Update: WORKER_URL, SERVICE_ID, API_KEY
```

3. Test it:

```bash
./heartbeat-client.sh
# Should output: [timestamp] Heartbeat sent successfully
```

4. Schedule it with cron (runs every 2 minutes):

```bash
crontab -e
# Add this line:
*/2 * * * * /path/to/heartbeat-client.sh >> /var/log/heartbeat.log 2>&1
```

### Option B: systemd (Recommended for Linux)

1. Copy the client script:

```bash
sudo cp examples/heartbeat-client.sh /usr/local/bin/heartbeat-client.sh
sudo chmod +x /usr/local/bin/heartbeat-client.sh
# Edit the script with your configuration
sudo vim /usr/local/bin/heartbeat-client.sh
```

2. Install systemd units:

```bash
sudo cp examples/systemd/heartbeat.service /etc/systemd/system/
sudo cp examples/systemd/heartbeat.timer /etc/systemd/system/
```

3. Start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable heartbeat.timer
sudo systemctl start heartbeat.timer
sudo systemctl status heartbeat.timer
```

### Option C: Docker

```bash
cd examples
# Edit docker-compose.yml with your configuration
docker-compose up -d
```

## Step 6: View Dashboard (1 min)

Open your browser to: `https://heartbeat-monitor.your-subdomain.workers.dev`

Wait up to 5 minutes for the first staleness check to run, then you'll see your service status!

## Verify Everything is Working

### 1. Test heartbeat manually

```bash
curl -X POST https://your-worker.workers.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"serviceId": "my-api", "status": "up"}'
```

Expected response:
```json
{"success":true,"message":"Heartbeat received","timestamp":"2024-..."}
```

### 2. Check worker logs

```bash
npm run tail
```

### 3. View status API

```bash
curl https://your-worker.workers.dev/api/status
```

## Common Issues

### "Invalid API key"
- Check that the API key in your client matches `services.json`
- Ensure proper Authorization header format: `Bearer your-key`

### Services show as "Unknown"
- Wait 5 minutes for first staleness check
- Verify heartbeats are being sent (check worker logs)
- Test heartbeat manually with curl

### Heartbeat script fails
- Check firewall allows outbound HTTPS (port 443)
- Verify WORKER_URL is correct and accessible
- Run script manually to see error messages

## Next Steps

- Add more services to monitor
- Customize heartbeat metadata
- Set up alerts (integrate with external services)
- Secure your dashboard with Cloudflare Access
- Adjust staleness thresholds based on your needs

## Full Documentation

See [README.md](README.md) for complete documentation.

## Support

- Check worker logs: `npm run tail`
- Review troubleshooting section in README.md
- Test API endpoints with curl

