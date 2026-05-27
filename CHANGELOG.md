# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Breaking

- `API_KEYS` is now required when any service has `auth.required: true`. Previously, missing `API_KEYS` silently disabled auth. Heartbeats for those services now return an error until `API_KEYS` is set.
- `ALERT_API_KEY` is now required for `POST /api/alert`. Previously, missing `ALERT_API_KEY` left the endpoint open. Set the secret with `wrangler secret put ALERT_API_KEY` before deploying.

## [1.0.0] - 2025-11-05

### Added
- ✨ Push-based heartbeat monitoring system
- 📊 Beautiful real-time dashboard
- 💾 Cloudflare KV storage integration
- 🔐 Per-service API key authentication
- ⏱️ Automatic staleness detection
- 🤖 Fully automated GitHub Actions deployment
- 🏗️ Terraform infrastructure as code
- 📦 Multiple heartbeat client examples (Bash, Python, Node.js)
- ⚙️ systemd and cron scheduling examples
- 🐳 Docker Compose example
- 📚 Comprehensive documentation

### Features
- **Zero Exposure Architecture**: Services push heartbeats, never exposed publicly
- **Automatic Setup**: GitHub Actions creates KV namespace via Terraform
- **Smart Deployment**: Detects first-time setup and handles configuration
- **Flexible Clients**: Multiple language implementations provided
- **Configurable Staleness**: Per-service threshold settings
- **Historical Logging**: Stores last 100 heartbeats per service
- **Auto-Refresh Dashboard**: Real-time status updates

### Documentation
- Quick Start Guide (10-minute setup)
- Architecture Overview with diagrams
- GitHub Actions Deployment Guide
- Pre-Deployment Checklist
- Permissions Guide
- Contributing Guidelines
- Project Structure Documentation
- Terraform Guide
- Heartbeat Client Examples

### Infrastructure
- Cloudflare Workers KV namespace
- Automated Terraform provisioning
- GitHub Actions CI/CD
- Dependabot integration

### Initial Release
First public release of the Cloudflare Heartbeat Monitor.

