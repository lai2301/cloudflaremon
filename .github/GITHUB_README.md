# GitHub Configuration

This directory contains GitHub-specific configuration files for the Cloudflare Heartbeat Monitor project.

## Contents

### Workflows (`.github/workflows/`)

Automated CI/CD workflows:

- **`deploy.yml`** - Production deployment with auto-setup (runs on push to main)
- **`preview.yml`** - Pull request validation (runs on PRs)

📖 See [workflows/README.md](workflows/README.md) for detailed documentation

### Templates

- **`pull_request_template.md`** - Template for pull requests
- **`CONTRIBUTING.md`** - Contribution guidelines

### Configuration

- **`dependabot.yml`** - Automated dependency updates

## Quick Links

- [CI/CD Workflows Documentation](workflows/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Project Documentation](../docs/README.md)
- [Main README](../README.md)

## GitHub Actions Setup

To use the automated deployment:

1. Add `CLOUDFLARE_API_TOKEN` to repository secrets
2. Optionally add `CLOUDFLARE_ACCOUNT_ID` (auto-detected if not provided)
3. Push to `main` branch

The workflow will automatically:
- Create KV namespace (first time only)
- Update wrangler.toml
- Deploy the worker

For detailed setup instructions, see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

