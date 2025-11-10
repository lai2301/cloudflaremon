# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Internal Network (Private)                    │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐    ┌──────────────┐ │
│  │  Service 1   │         │  Service 2   │    │  Service N   │ │
│  │              │         │              │    │              │ │
│  │  • API       │         │  • Database  │    │  • Worker    │ │
│  │  • Web App   │         │  • Queue     │    │  • Job       │ │
│  └──────────────┘         └──────────────┘    └──────────────┘ │
│         │                        │                    │         │
│         │                        │                    │         │
│    ┌────▼────────────────────────▼────────────────────▼────┐   │
│    │         Heartbeat Clients (cron/systemd)            │   │
│    │                                                       │   │
│    │  • Lightweight scripts (Bash/Python/Node.js)        │   │
│    │  • Send POST requests every 2 minutes               │   │
│    │  • Include metadata (optional)                      │   │
│    └───────────────────────────┬───────────────────────────┘   │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                  Outbound HTTPS (Port 443)
                  Only connection needed!
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │   Internet (Public)               │
              │                                   │
              │    Cloudflare Global Network     │
              └───────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────────┐
         │      Cloudflare Worker                     │
         │   (heartbeat-monitor.workers.dev)         │
         │                                            │
         │  Endpoints:                                │
         │  • POST /api/heartbeat  (receive)         │
         │  • GET  /api/status     (current)         │
         │  • GET  /api/logs       (history)         │
         │  • GET  /               (dashboard)        │
         │                                            │
         │  Scheduled Tasks:                         │
         │  • Check staleness (every 5 min)          │
         │  • Update service status                   │
         └────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │    Cloudflare KV Storage          │
              │                                   │
              │  • monitor:latest                │
              │    (heartbeat timestamps)        │
              │  • monitor:data                  │
              │    (summary + uptime stats)      │
              │  • recent:alerts                 │
              │    (alert history)               │
              └───────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │         Dashboard Users           │
              │                                   │
              │  Access via browser:             │
              │  https://your-worker.workers.dev │
              └───────────────────────────────────┘
```

## Data Flow

### 1. Heartbeat Push (Every 2 minutes)

```
Internal Service → Heartbeat Client → POST /api/heartbeat → Worker
                                                              ↓
                                                         KV Storage
                                                              ↓
                                                    Store heartbeat data
                                                    Update latest timestamp
```

**Payload:**
```json
{
  "serviceId": "service-1",
  "status": "up",
  "metadata": { "hostname": "server-1" },
  "message": "Heartbeat from server-1"
}
```

### 2. Staleness Check (Every 10 minutes, via cron)

```
Cloudflare Cron Trigger → Worker scheduled() function
                             ↓
                    Read monitor:latest from KV
                    Read monitor:data from KV
                             ↓
                    Calculate time since last heartbeat
                             ↓
                    Compare with stalenessThreshold
                             ↓
                    Determine status (up/down/unknown)
                             ↓
                    Update uptime statistics
                             ↓
                    Store updated monitor:data in KV
```

### 3. Dashboard View (On-demand)

```
User Browser → GET / → Worker
                        ↓
                   Read monitor:latest from KV
                   Read monitor:data from KV
                        ↓
                   Embed data into HTML
                        ↓
                   Return dashboard with embedded data
                        ↓
                   (Optional) JavaScript polls /api/alerts/recent
                        ↓
                   Auto-refresh configurable (default: disabled)
```

## Key Design Decisions

### Why Push-Based?

1. **Security**: No inbound connections to internal services
2. **Simplicity**: No VPN, tunnels, or complex networking
3. **Firewall Friendly**: Works through corporate firewalls (outbound HTTPS only)
4. **Scalability**: Easy to add new services

### Why Cloudflare Workers?

1. **Global Edge Network**: Low latency worldwide
2. **Serverless**: No servers to manage
3. **Free Tier**: 100,000 requests/day free
4. **KV Storage**: Fast, distributed key-value store
5. **Cron Triggers**: Built-in scheduling

### Why KV Storage?

1. **Fast**: Edge-cached, low latency
2. **Distributed**: Global replication
3. **Simple**: Key-value interface
4. **Cost-Effective**: Free tier sufficient for most use cases
5. **Durable**: Reliable storage

### Why Separate KV Keys?

The system uses two separate KV keys (`monitor:latest` and `monitor:data`) to prevent race conditions:

**Problem**: When both heartbeat updates and cron checks write to the same key, they can overwrite each other's changes due to KV's eventual consistency model.

**Solution**: Separate concerns:
- Heartbeats ONLY update `monitor:latest` (timestamps)
- Cron ONLY updates `monitor:data` (summary + uptime)
- Dashboard reads both keys

**Benefits**:
1. **No race conditions**: Updates don't conflict
2. **Smaller heartbeat writes**: Only timestamps, not full statistics
3. **Consistent status**: Cron-generated summaries are never overwritten
4. **Better performance**: Reduced payload sizes for frequent operations

## Component Details

### Heartbeat Client

**Purpose**: Send periodic health signals to the worker

**Features**:
- Lightweight (single HTTP request)
- Customizable metadata
- Error handling
- Logging

**Scheduling Options**:
- Cron (simple, traditional)
- systemd timer (modern, reliable)
- Docker (containerized)

### Cloudflare Worker

**Purpose**: Receive heartbeats, check staleness, serve dashboard

**Responsibilities**:
1. Validate incoming heartbeats
2. Authenticate via API keys
3. Store heartbeat data in KV
4. Check for stale services (scheduled)
5. Serve dashboard and API endpoints

**Routes**:
- `POST /api/heartbeat` - Receive heartbeat from services
- `GET /api/status` - Get current status summary
- `GET /api/logs?serviceId=X` - Get historical logs
- `GET /api/services` - List configured services
- `GET /` - Dashboard UI

### KV Storage

**Purpose**: Persist heartbeat data and service status

**Keys**:
- `monitor:latest` - Latest heartbeat timestamps for all services (JSON object: `{serviceId: timestamp}`)
  - Updated by: Heartbeat handler
  - Read by: Cron checks, Dashboard
  
- `monitor:data` - Service status and uptime statistics (JSON object)
  - Contains: `summary` (current status) and `uptime` (daily statistics per service)
  - Updated by: Cron scheduled task
  - Read by: Dashboard, API endpoints
  
- `recent:alerts` - Dashboard alert history (JSON array)
  - Contains: External alerts and service status change notifications
  - Updated by: Alert handlers, Service monitoring
  - Configurable retention (default: 100 alerts, 7 days)

**Data Retention**:
- Latest timestamps: All enabled services (live data)
- Uptime statistics: Configurable (default: 120 days per service)
- Alert history: Configurable (default: 100 alerts or 7 days)

### Dashboard

**Purpose**: Visual monitoring interface

**Features**:
- Real-time status display
- Summary cards (total, up, down, unknown)
- Per-service details
- Auto-refresh (30s)
- Responsive design
- No authentication (by default)

## Timing Configuration

### Recommended Settings

```
Heartbeat Interval:     2-5 minutes (120-300 seconds)
Staleness Threshold:    5-10 minutes (300-600 seconds)
Staleness Check:        10 minutes (cron)
Dashboard Refresh:      Manual or configurable auto-refresh
Alert Polling:          10-60 seconds (if enabled)
```

### Why These Values?

1. **2-5 minute heartbeats**: Balance between freshness and KV operation costs
2. **5-10 minute threshold**: Allows 2 missed heartbeats before alerting
3. **10-minute staleness check**: Efficient detection with minimal KV operations
4. **Manual dashboard refresh**: Embedded data eliminates need for auto-refresh
5. **Alert polling**: Only if real-time notifications are needed

### Customization

You can adjust these based on your needs:

- **Critical services**: 30s heartbeat, 2m threshold, 1m check
- **Standard services**: 2m heartbeat, 5m threshold, 5m check
- **Low-priority**: 10m heartbeat, 30m threshold, 15m check

## Security Model

### Authentication Flow

```
Heartbeat Client
    ↓
Include Authorization: Bearer {apiKey}
    ↓
POST /api/heartbeat
    ↓
Worker validates:
  1. serviceId exists in services.json
  2. apiKey matches (if configured)
    ↓
Accept or reject request
```

### Security Layers

1. **API Key Authentication**: Per-service keys
2. **HTTPS Only**: All communication encrypted
3. **Cloudflare Network**: DDoS protection
4. **No Credentials Stored**: Services don't need to store anything sensitive
5. **Outbound Only**: No inbound firewall rules needed

## Scalability

### Current Limits

- **Services**: ~100-500 (KV write limits and processing time)
- **Heartbeat Frequency**: 2-10 minutes recommended
- **Storage**: Minimal (2 primary KV entries + alert history)
- **Requests**: 100,000/day (free tier)
- **KV Operations**: Primary constraint (1000 writes/day on free tier)

### Scaling Beyond Free Tier

If you need more:
1. **Workers Paid**: $5/month for 10M requests
2. **KV Paid**: $0.50/GB storage
3. **Multiple Workers**: Split services across workers

### Optimization Tips

1. Reduce heartbeat frequency for non-critical services
2. Clean up old data periodically
3. Use metadata sparingly
4. Increase staleness thresholds where possible

## Monitoring the Monitor

### How to Monitor

1. **Worker Logs**: `npm run tail`
2. **Cloudflare Dashboard**: View request metrics
3. **KV Usage**: Check storage consumption
4. **Dashboard Health**: Monitor your own worker!

### Key Metrics

- Heartbeat success rate
- KV read/write operations
- Worker execution time
- Error rates

## Implemented Features

Recently added capabilities:

1. ✅ **Multi-Channel Notifications**: Discord, Slack, Telegram, Email, PagerDuty, Pushover, Webhook
2. ✅ **External Alert Integration**: Grafana, Alertmanager, custom webhooks
3. ✅ **Real-time Dashboard Alerts**: Toast and browser notifications
4. ✅ **Alert History**: Searchable history with configurable retention
5. ✅ **Uptime Statistics**: Daily uptime tracking with configurable retention (120 days)
6. ✅ **CSV Export**: Historical data export with custom date ranges
7. ✅ **API Endpoint Controls**: Enable/disable individual endpoints
8. ✅ **Customizable Alerts**: Severity filtering, polling intervals

## Future Enhancements

Potential improvements:

1. **Authentication**: Add login to dashboard (currently supports Cloudflare Access)
2. **Charts**: Visual graphs of uptime trends
3. **Multi-region Tracking**: Identify which region/datacenter sent heartbeat
4. **Service Dependencies**: Track and visualize service dependencies
5. **Custom Status Pages**: Public-facing status page generation
6. **Synthetic Monitoring**: Active checks in addition to heartbeats
7. **Performance Metrics**: Track response times and custom metrics

## Comparison with Alternatives

| Feature | This Solution | Traditional Monitoring | Cloud Services |
|---------|--------------|----------------------|----------------|
| Cost | Free - $5/mo | $50-500/mo | $20-200/mo |
| Setup Time | 10 minutes | Hours/Days | 30 min - 2 hours |
| Exposure | None | Inbound required | Varies |
| Maintenance | Minimal | High | Low |
| Scalability | 100-1000 services | Unlimited | Unlimited |
| Customization | Full control | Limited | Limited |

## Best For

This solution is ideal for:

✅ Internal services that shouldn't be exposed
✅ Small to medium deployments (< 100 services)
✅ Budget-conscious teams
✅ Simple uptime monitoring
✅ Teams comfortable with Cloudflare

Not ideal for:

❌ Complex health checks (use dedicated monitoring)
❌ Sub-second monitoring requirements
❌ 1000+ services (consider paid alternatives)
❌ Teams without Cloudflare experience

## Questions?

Check the main [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md) for more details.

