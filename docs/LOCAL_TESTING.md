# Local Testing Guide

This guide explains how to test the Cloudflare Heartbeat Monitor application locally without connecting to remote Cloudflare KV storage.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed Sample Data into Local KV

The easiest way to get started with local testing is to seed sample data that matches your configured services:

```bash
node scripts/seed-local-test-data.js
```

This script will:
- Read your configured services from `config/services.json`
- Generate realistic sample data (60 days of uptime history by default)
- Write the data to local KV storage using wrangler CLI

**What gets created:**
- `monitor:latest` - Recent heartbeat timestamps for all services
- `monitor:data` - Service status summary and uptime statistics

### 3. Start the Development Server

```bash
npm run dev
```

The server will start at `http://localhost:8787` (or the port shown in the output).

### 4. View the Dashboard

Open `http://localhost:8787` in your browser. You should see:
- All your configured services
- Sample uptime data (60 days by default)
- Service status based on the seeded data

## Alternative: Send Real Heartbeats

Instead of seeding data, you can send real heartbeats to your local dev server:

### Using curl

```bash
curl -X POST http://localhost:8787/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "serviceId": "gmk-m6",
    "status": "up",
    "message": "Test heartbeat"
  }'
```

### Using the Heartbeat Client Scripts

You can also use the heartbeat client scripts from `heartbeat-clients/` directory, just point them to your local URL:

```bash
# Edit the script to use:
WORKER_URL="http://localhost:8787"
```

## Managing Local KV Data

### View Data

```bash
# View latest heartbeats
npx wrangler kv key get "monitor:latest" --binding=HEARTBEAT_LOGS --local

# View full monitor data
npx wrangler kv key get "monitor:data" --binding=HEARTBEAT_LOGS --local
```

### Clear Data

```bash
# Delete specific keys
npx wrangler kv key delete "monitor:latest" --binding=HEARTBEAT_LOGS --local
npx wrangler kv key delete "monitor:data" --binding=HEARTBEAT_LOGS --local

# Or re-run the seed script to regenerate data
node scripts/seed-local-test-data.js
```

### List All Keys

```bash
npx wrangler kv key list --binding=HEARTBEAT_LOGS --local
```

## Local KV Storage Location

Local KV data is stored in:
- **Linux/Mac**: `~/.wrangler/state/v3/kv/[namespace-id]/`
- **Windows**: `%USERPROFILE%\.wrangler\state\v3\kv\[namespace-id]\`

The data persists between dev server restarts until you manually delete it.

## Important Notes

1. **Cron Triggers Don't Work Locally**: Scheduled staleness checks won't run in local development. You can:
   - Manually trigger status checks by accessing `/api/status`
   - Send heartbeats to update the data
   - Wait for deployment to test cron functionality

2. **Authentication**: If your services require API keys, make sure to:
   - Set them as environment variables or in `.dev.vars` file
   - Use the correct API key when sending heartbeats

3. **Data Persistence**: Local KV data persists until you:
   - Delete the keys manually
   - Clear the `.wrangler` directory
   - Run the seed script again (overwrites existing data)

## Troubleshooting

### "No data in dashboard"

- Make sure you've seeded the data: `node scripts/seed-local-test-data.js`
- Check that the dev server is running: `npm run dev`
- Verify KV data exists: `npx wrangler kv key list --binding=HEARTBEAT_LOGS --local`

### "Invalid API key" errors

- Check your `config/services.json` for API key requirements
- For local testing, you can temporarily disable auth in service config
- Or set API keys in `.dev.vars` file (see Wrangler docs)

### Services show as "Unknown"

- This is normal if no heartbeats have been sent yet
- Seed the data to see sample statuses
- Or send a test heartbeat using curl

## Customizing Sample Data

The seed script (`scripts/seed-local-test-data.js`) can be customized:

- **Change retention days**: Edit `retentionDays` in `config/settings.json`
- **Modify uptime percentages**: Edit the `generateUptimeData()` function
- **Add more services**: Add them to `config/services.json` and re-run the script

## Next Steps

Once you've tested locally:

1. Deploy to Cloudflare: `npm run deploy`
2. Set up real heartbeat clients on your services
3. Configure notifications (see [NOTIFICATIONS.md](NOTIFICATIONS.md))
4. Set up API keys for production (see [SECURITY.md](SECURITY.md))

