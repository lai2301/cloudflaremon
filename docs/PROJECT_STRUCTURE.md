# Project Structure

Clear overview of the Cloudflare Heartbeat Monitor file organization.

## Directory Tree

```
cloudflaremon/
├── 📄 README.md                    # Main project overview
├── 📄 package.json                 # Node.js dependencies
├── 📄 package-lock.json            # Locked dependencies
├── 📄 wrangler.toml                # Cloudflare Worker config
├── 📄 .gitignore                   # Git ignore rules
├── 📄 .nvmrc                       # Node.js version (20)
│
├── 📁 config/                      # ⚙️ Configuration files
│   ├── README.md                  # Config documentation
│   ├── services.json              # Services to monitor
│   ├── dashboard.json             # UI appearance & branding
│   ├── settings.json              # Feature toggles & behavior
│   ├── notifications.json         # Alert notifications config
│   └── ui.json                    # Legacy config (deprecated)
│
├── 📁 src/                         # 💻 Worker source code
│   ├── index.js                   # Main worker (routing & dashboard)
│   ├── config/                    # Configuration management
│   │   └── loader.js              # Config loader & merger
│   ├── handlers/                  # API request handlers
│   │   ├── heartbeat.js           # POST /api/heartbeat
│   │   ├── alert.js               # POST /api/alert, GET /api/alerts/recent
│   │   ├── status.js              # GET /api/status
│   │   └── uptime.js              # GET /api/uptime
│   └── core/                      # Core business logic
│       ├── monitoring.js          # Heartbeat staleness checks
│       └── notifications.js       # Notification system
│
├── 📁 docs/                        # 📚 Documentation
│   ├── README.md                  # Documentation index
│   ├── QUICKSTART.md              # 10-minute setup guide
│   ├── ARCHITECTURE.md            # System design & diagrams
│   ├── DEPLOYMENT.md              # GitHub Actions setup
│   ├── AUTHENTICATION.md          # Auth configuration guide
│   ├── NOTIFICATIONS.md           # Notification system guide
│   ├── ALERT_NOTIFICATIONS.md     # Dashboard alerts guide
│   ├── EXTERNAL_ALERTS.md         # External alert integration
│   ├── UI_CUSTOMIZATION.md        # UI customization guide
│   ├── SETUP_CHECKLIST.md         # Pre-deployment checklist
│   ├── SECURITY.md                # Security best practices
│   └── ...                        # Additional documentation
│
├── 📁 examples/                    # 📦 Example configurations
│   ├── services.example.json      # Example services config
│   ├── dashboard.example.json     # Example dashboard config
│   ├── settings.example.json      # Example settings config
│   ├── notifications.example.json # Example notifications config
│   └── ui.example.json            # Legacy example
│
├── 📁 clients/                     # 🔌 Heartbeat client examples
│   ├── README.md                  # Client implementation guide
│   ├── heartbeat-client.sh        # Bash client
│   ├── heartbeat-client.py        # Python client
│   ├── heartbeat-client.js        # Node.js client
│   ├── crontab.example            # Cron examples
│   ├── docker-compose.yml         # Docker setup
│   ├── test-notification.sh       # Test notification script
│   └── systemd/                   # systemd units
│       ├── heartbeat.service      # systemd service
│       └── heartbeat.timer        # systemd timer
│
├── 📁 scripts/                     # 🔧 Helper scripts
│   ├── generate-api-keys.sh       # Generate API keys (Bash)
│   ├── generate-api-keys.py       # Generate API keys (Python)
│   └── seed-test-data.js          # Seed test data for dev
│
├── 📁 terraform/                   # 🏗️ Infrastructure as Code
│   ├── README.md                  # Terraform guide
│   ├── main.tf                    # Main config
│   ├── variables.tf               # Variable definitions
│   ├── terraform.tfvars.example   # Example variables
│   ├── wrangler.toml.tpl         # wrangler.toml template
│   └── .terraform.lock.hcl       # Provider lock file
│
└── 📁 .github/                     # ⚙️ GitHub configuration
    ├── README.md                  # GitHub config overview
    ├── CONTRIBUTING.md            # Contribution guidelines
    ├── dependabot.yml             # Dependency updates
    ├── pull_request_template.md   # PR template
    └── workflows/                 # CI/CD workflows
        ├── README.md              # Workflows documentation
        ├── deploy.yml             # Production deployment
        ├── preview.yml            # PR validation
        └── debug-secrets.yml      # Debug helper (manual)
```

## Key Files Explained

### Root Level

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation, features, and quick overview |
| `package.json` | Node.js project config and dependencies |
| `wrangler.toml` | Cloudflare Worker configuration |
| `.nvmrc` | Specifies Node.js version (v20) |

### Configuration (`config/`)

| File | Purpose |
|------|---------|
| `README.md` | Configuration documentation and guide |
| `services.json` | Services to monitor, groups, and authentication settings |
| `dashboard.json` | UI appearance, branding, themes, and colors |
| `settings.json` | Feature toggles, uptime settings, and behavior config |
| `notifications.json` | Alert notifications, channels, and templates |
| `ui.json` | Legacy config (deprecated, use dashboard.json + settings.json) |

### Source Code (`src/`)

| File/Directory | Purpose |
|----------------|---------|
| `index.js` | Main worker entry point (routing, dashboard HTML/CSS/JS) |
| `config/loader.js` | Configuration file loader and merger |
| `handlers/heartbeat.js` | POST /api/heartbeat handler (single & batch) |
| `handlers/alert.js` | POST /api/alert, GET /api/alerts/recent handlers |
| `handlers/status.js` | GET /api/status handler |
| `handlers/uptime.js` | GET /api/uptime handler (historical data) |
| `core/monitoring.js` | Heartbeat staleness checks and service monitoring |
| `core/notifications.js` | Notification system (Discord, Slack, Email, etc.) |

**Architecture:**
- **Modular design** - Separated concerns for maintainability
- **Clean imports** - Each module has focused responsibility
- **Handlers** - API request processing
- **Core logic** - Business logic and scheduled tasks

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `README.md` | Documentation index and navigation |
| `QUICKSTART.md` | Fast 10-minute setup guide |
| `ARCHITECTURE.md` | System design, data flow, diagrams |
| `DEPLOYMENT.md` | GitHub Actions deployment guide |
| `SETUP_CHECKLIST.md` | Pre-deployment verification checklist |
| `PERMISSIONS.md` | GitHub Actions permissions explained |

### Example Configurations (`examples/`)

| File | Purpose |
|------|---------|
| `README.md` | Client implementation guide |
| `heartbeat-client.sh` | Bash implementation (minimal deps) |
| `heartbeat-client.py` | Python implementation (feature-rich) |
| `heartbeat-client.js` | Node.js implementation (no deps) |
| `crontab.example` | Cron scheduling examples |
| `docker-compose.yml` | Containerized heartbeat sender |
| `systemd/heartbeat.service` | systemd service unit |
| `systemd/heartbeat.timer` | systemd timer unit |

### Infrastructure (`terraform/`)

| File | Purpose |
|------|---------|
| `README.md` | Terraform setup and usage guide |
| `main.tf` | Main Terraform configuration |
| `variables.tf` | Input variable definitions |
| `terraform.tfvars.example` | Example configuration |
| `wrangler.toml.tpl` | Template for generating wrangler.toml |
| `.terraform.lock.hcl` | Provider version lock file |

**What Terraform creates:**
- Cloudflare Workers KV namespace
- Automatically updated wrangler.toml

### GitHub Config (`.github/`)

| File | Purpose |
|------|---------|
| `README.md` | GitHub configuration overview |
| `CONTRIBUTING.md` | Contribution guidelines and workflow |
| `dependabot.yml` | Automated dependency updates config |
| `pull_request_template.md` | PR template for contributors |
| `workflows/deploy.yml` | Production deployment workflow |
| `workflows/preview.yml` | PR validation workflow |
| `workflows/README.md` | CI/CD documentation |

## Workflow

### First-Time Setup

```
1. Clone repository
2. Configure GitHub secrets (CLOUDFLARE_API_TOKEN)
3. Push to main
4. GitHub Actions runs:
   ├─ Creates KV namespace (Terraform)
   ├─ Updates wrangler.toml
   ├─ Commits changes
   └─ Deploys worker
5. Set up heartbeat clients on internal services
```

### Development Workflow

```
1. Create feature branch
2. Make changes
3. Open pull request
4. PR validation runs (preview.yml)
5. Review and merge
6. Auto-deploy on merge (deploy.yml)
```

### Heartbeat Flow

```
Internal Service
    ↓
Heartbeat Client (examples/)
    ↓
POST /api/heartbeat
    ↓
Cloudflare Worker (src/index.js)
    ↓
KV Storage
    ↓
Dashboard (GET /)
```

## File Categories

### ⚙️ Configuration Files
- `wrangler.toml` - Worker configuration
- `config/services.json` - Services to monitor
- `config/dashboard.json` - UI customization
- `config/settings.json` - Feature toggles
- `config/notifications.json` - Alert notifications
- `package.json` - Node.js project
- `.nvmrc` - Node.js version

### 💻 Source Code
- `src/index.js` - Main entry point & routing
- `src/config/` - Configuration management
- `src/handlers/` - API request handlers
- `src/core/` - Business logic & scheduled tasks

### 📚 Documentation
- `docs/*.md` - All documentation
- `README.md` - Main overview
- `config/README.md` - Configuration guide

### 📦 Example Files
- `examples/*` - Example configuration files
- `clients/*` - Heartbeat client implementations

### 🔧 Helper Scripts
- `scripts/*` - Utility and helper scripts

### 🏗️ Infrastructure
- `terraform/*` - Infrastructure as code

### ⚙️ CI/CD
- `.github/workflows/*` - GitHub Actions

### 🔧 Development
- `.github/CONTRIBUTING.md` - Contribution guide
- `docs/PROJECT_STRUCTURE.md` - This file

## Not in Repository (Gitignored)

```
node_modules/         # Dependencies (npm install)
.wrangler/           # Wrangler build cache
terraform/.terraform/ # Terraform plugins
terraform/*.tfvars   # Terraform secrets
*.log                # Log files
.DS_Store            # macOS files
```

## Important Notes

### DO Commit
✅ All documentation
✅ Example files
✅ Configuration templates
✅ Source code
✅ wrangler.toml (after first deployment)

### DON'T Commit
❌ `node_modules/`
❌ Terraform state files
❌ Secrets and API keys
❌ Log files
❌ `.env` or `.dev.vars`

## Quick Navigation

- **Getting Started:** [docs/QUICKSTART.md](docs/QUICKSTART.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Deployment:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Examples:** [examples/README.md](examples/README.md)
- **Terraform:** [terraform/README.md](terraform/README.md)
- **Contributing:** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

## Questions?

See [docs/README.md](docs/README.md) for complete documentation index.

