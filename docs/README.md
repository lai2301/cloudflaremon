# Documentation

Complete documentation for the Cloudflare Heartbeat Monitor.

## Getting Started

- **[Quick Start Guide](QUICKSTART.md)** - Set up and deploy in 10 minutes

## Architecture & Design

- **[Architecture Overview](ARCHITECTURE.md)** - System design, data flow, and component details

## Deployment

- **[Deployment Guide](DEPLOYMENT.md)** - GitHub Actions automated deployment
- **[Setup Checklist](SETUP_CHECKLIST.md)** - Pre-deployment verification steps
- **[Terraform Guide](../terraform/README.md)** - Infrastructure as code setup

## Development

- **[Contributing Guide](../.github/CONTRIBUTING.md)** - How to contribute to this project
- **[Workflows Documentation](../.github/workflows/README.md)** - CI/CD pipeline details
- **[Permissions Guide](PERMISSIONS.md)** - GitHub Actions permissions explained

## Usage

- **[Heartbeat Client Examples](../examples/README.md)** - Implementation guides for all platforms
  - Bash, Python, Node.js
  - Cron, systemd, Docker
  
## Reference

- [Main README](../README.md) - Project overview and features
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Terraform Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)

## Navigation

```
📁 Project Structure
├── 📖 docs/                    ← You are here
│   ├── QUICKSTART.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── SETUP_CHECKLIST.md
│   └── PERMISSIONS.md
├── 🔧 .github/
│   ├── workflows/
│   ├── CONTRIBUTING.md
│   └── pull_request_template.md
├── 📦 examples/
│   ├── heartbeat-client.sh
│   ├── heartbeat-client.py
│   ├── heartbeat-client.js
│   └── systemd/
├── 🏗️ terraform/
│   ├── main.tf
│   └── README.md
└── 💻 src/
    └── index.js
```

## Quick Links

| Topic | Document |
|-------|----------|
| **First time setup** | [Quick Start](QUICKSTART.md) |
| **Understanding the system** | [Architecture](ARCHITECTURE.md) |
| **Deploying to production** | [Deployment](DEPLOYMENT.md) |
| **Creating heartbeat clients** | [Examples](../examples/README.md) |
| **Infrastructure as code** | [Terraform](../terraform/README.md) |
| **CI/CD workflows** | [Workflows](../.github/workflows/README.md) |
| **Contributing code** | [Contributing](../.github/CONTRIBUTING.md) |

## Need Help?

1. Check the relevant documentation above
2. Review the [troubleshooting section](DEPLOYMENT.md#troubleshooting) in the Deployment Guide
3. Look at [example implementations](../examples/README.md)
4. Check [GitHub issues](https://github.com/lai2301/cloudflaremon/issues)
5. Review [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)

