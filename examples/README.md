# Heartbeat Client Examples

This directory contains example heartbeat client implementations in various languages and deployment methods.

## Quick Start

1. Choose a client that matches your environment
2. Copy the script to your internal service/server
3. Edit the configuration variables:
   - `WORKER_URL`: Your Cloudflare Worker URL
   - `SERVICE_ID`: The service ID from `services.json`
   - `API_KEY`: The API key from `services.json`
4. Test the script manually
5. Set up scheduling (cron, systemd, etc.)

## Available Clients

### Scripts

- **`heartbeat-client.sh`**: Bash script (requires curl)
  - Minimal dependencies
  - Works on any Linux/Unix system
  - Great for simple deployments

- **`heartbeat-client.py`**: Python script (requires requests library)
  - Easy to extend with custom health checks
  - Cross-platform (Linux, Windows, macOS)
  - Good for adding custom metadata

- **`heartbeat-client.js`**: Node.js script (no dependencies)
  - Uses built-in https module
  - Fast and lightweight
  - Good for Node.js environments

### Scheduling

- **`crontab.example`**: Cron examples
  - Traditional Unix/Linux scheduling
  - Simple to set up
  - Works on most systems

- **`systemd/heartbeat.service`**: systemd service unit
  - Modern Linux systems
  - Better logging and error handling
  - Automatic restart on failure

- **`systemd/heartbeat.timer`**: systemd timer unit
  - More reliable than cron
  - Precise timing control
  - Use with heartbeat.service

### Containerized

- **`docker-compose.yml`**: Docker Compose example
  - Containerized heartbeat sender
  - Easy deployment with Docker
  - Can run alongside other containers

## Testing

Test your heartbeat client before scheduling:

```bash
# Bash
./heartbeat-client.sh

# Python
python3 heartbeat-client.py

# Node.js
node heartbeat-client.js
```

Expected output:
```
[timestamp] Heartbeat sent successfully
```

## Scheduling Recommendations

### For Production Environments

**Use systemd timers** (Linux):
- More reliable than cron
- Better logging and monitoring
- Automatic restart on failure

```bash
sudo cp systemd/heartbeat.service /etc/systemd/system/
sudo cp systemd/heartbeat.timer /etc/systemd/system/
sudo systemctl enable heartbeat.timer
sudo systemctl start heartbeat.timer
```

### For Simple Deployments

**Use cron**:
```bash
crontab -e
# Add: */2 * * * * /path/to/heartbeat-client.sh >> /var/log/heartbeat.log 2>&1
```

### For Containerized Environments

**Use Docker Compose**:
```bash
docker-compose up -d
```

## Timing Recommendations

- **Heartbeat interval**: 2 minutes (120 seconds)
- **Staleness threshold**: 5 minutes (300 seconds)
- **Worker cron**: Every 5 minutes

This gives you:
- 2 attempts within the staleness window
- Quick detection of failures (within 5 minutes)
- Low network overhead

## Custom Metadata

You can add custom metadata to heartbeats:

```bash
# Example with custom metadata
curl -X POST "$WORKER_URL/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "serviceId": "my-service",
    "status": "up",
    "metadata": {
      "hostname": "'$(hostname)'",
      "uptime": "'$(uptime -p)'",
      "load": "'$(uptime | awk -F'load average:' '{print $2}')'",
      "disk_usage": "75%",
      "memory_usage": "60%"
    },
    "message": "Service healthy"
  }'
```

## Troubleshooting

### "Connection refused" or "Connection timeout"

- Check firewall rules (need outbound HTTPS access)
- Verify WORKER_URL is correct
- Test with: `curl -v https://your-worker.workers.dev`

### "Invalid API key" error

- Verify API_KEY matches `services.json`
- Check for extra spaces or quotes
- API keys are case-sensitive

### "Unknown serviceId" error

- Verify SERVICE_ID exists in `services.json`
- Check for typos
- Service IDs are case-sensitive

### Script runs but dashboard shows "Unknown"

- Wait 5 minutes for staleness check to run
- Check worker logs: `npx wrangler tail`
- Verify heartbeat is being received in worker logs

## Need Help?

- Check the main README.md
- Review worker logs with `npm run tail`
- Test the API endpoint directly with curl

