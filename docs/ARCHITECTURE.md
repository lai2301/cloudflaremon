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
              │  • heartbeats:{serviceId}        │
              │  • latest:{serviceId}            │
              │  • logs:{serviceId}              │
              │  • summary:latest                │
              │  • summary:history               │
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

### 2. Staleness Check (Every 5 minutes, via cron)

```
Cloudflare Cron Trigger → Worker scheduled() function
                             ↓
                    Read latest:{serviceId} from KV
                             ↓
                    Calculate time since last heartbeat
                             ↓
                    Compare with stalenessThreshold
                             ↓
                    Determine status (up/down/unknown)
                             ↓
                    Store summary in KV
```

### 3. Dashboard View (On-demand)

```
User Browser → GET / → Worker
                        ↓
                   Load dashboard HTML
                        ↓
                   JavaScript loads status
                        ↓
                   GET /api/status → Read summary:latest from KV
                        ↓
                   Display service status
                        ↓
                   Auto-refresh every 30s
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
- `heartbeats:{serviceId}` - Recent heartbeats (array, max 100)
- `latest:{serviceId}` - Timestamp of last heartbeat
- `logs:{serviceId}` - Staleness check results (array, max 100)
- `summary:latest` - Current status of all services
- `summary:history` - Historical summaries (array, max 1000)

**Data Retention**:
- Heartbeats: Last 100 per service
- Logs: Last 100 checks per service
- Summary history: Last 1000 summaries

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
Heartbeat Interval:     2 minutes (120 seconds)
Staleness Threshold:    5 minutes (300 seconds)
Staleness Check:        5 minutes (cron)
Dashboard Refresh:      30 seconds (auto)
```

### Why These Values?

1. **2-minute heartbeats**: Balance between freshness and overhead
2. **5-minute threshold**: Allows 2 missed heartbeats before alerting
3. **5-minute staleness check**: Matches threshold for timely detection
4. **30-second dashboard**: Real-time feel without excessive polling

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

- **Services**: ~100-1000 (KV write limits)
- **Heartbeat Frequency**: 30s - 10m recommended
- **Storage**: ~1GB KV storage (free tier)
- **Requests**: 100,000/day (free tier)

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

## Future Enhancements

Potential improvements:

1. **Alerting**: Integrate with Slack, Discord, PagerDuty
2. **Authentication**: Add login to dashboard
3. **Webhooks**: Trigger external actions on status changes
4. **Charts**: Historical graphs of uptime
5. **Multi-region**: Track which region sent heartbeat
6. **Health Scores**: Calculate uptime percentages
7. **Dependencies**: Track service dependencies
8. **Custom Status Pages**: Public status page generation

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

