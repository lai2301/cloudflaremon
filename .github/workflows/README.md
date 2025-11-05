# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Cloudflare Heartbeat Monitor.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Push to main                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  deploy.yml    │ ──► Deploy to Production
              └────────────────┘


┌─────────────────────────────────────────────────────────┐
│              Open/Update Pull Request                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  preview.yml   │ ──► Validate Configuration
              └────────────────┘     Comment on PR
```

## Workflows

### 1. `deploy.yml` - Production Deployment with Auto-Setup

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch
- Manual dispatch from Actions tab

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Fetch Account ID (from secret or API)
5. **Check if KV namespace needs creation**
6. **If needed: Setup Terraform**
7. **If needed: Create KV namespace with Terraform**
8. **If needed: Commit updated wrangler.toml**
9. Deploy to Cloudflare Workers

**Smart Setup:**
- ✨ Automatically creates KV namespace on first deployment
- ✨ Uses Terraform to provision infrastructure
- ✨ Commits updated `wrangler.toml` automatically
- ✨ Skips setup on subsequent deployments (already configured)

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` ✅ Required

**Optional Secrets:**
- `CLOUDFLARE_ACCOUNT_ID` (fetched from API if not provided)

**Duration:** 
- First deployment: ~3-4 minutes (includes Terraform setup)
- Subsequent deployments: ~1-2 minutes (skips Terraform)

---

### 2. `preview.yml` - Pull Request Validation

**File:** `.github/workflows/preview.yml`

**Triggers:**
- Pull requests to `main` branch

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Validate `services.json` syntax
5. Validate `wrangler.toml` (dry-run deploy)
6. Comment on PR with results

**Required Secrets:**
- None (uses built-in `GITHUB_TOKEN`)

**Required Permissions:**
- `contents: read` - Read repository code
- `pull-requests: write` - Comment on PRs
- `issues: write` - Comment on issues/PRs

**Duration:** ~1 minute

---

## Setup

### First Time Setup

1. **Get Cloudflare API Token:**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Create Token → Use "Edit Cloudflare Workers" template
   - Copy the token

2. **Add to GitHub Secrets:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - New secret: `CLOUDFLARE_API_TOKEN`
   - Paste your token

3. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Add package-lock.json"
   git push origin main
   ```

4. **Watch it deploy!**
   - Go to Actions tab to see progress

### Optional: Add Account ID

To speed up deployments (skip API lookup):

```bash
# Add CLOUDFLARE_ACCOUNT_ID secret with your account ID
```

## Monitoring

### View Workflow Status

- **Actions Tab:** See all workflow runs
- **Commit Page:** See status checks on commits
- **PR Page:** See validation status on PRs

### Badges

Add this to your README.md:

```markdown
[![Deploy](https://github.com/USERNAME/REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/deploy.yml)
[![Validate](https://github.com/USERNAME/REPO/actions/workflows/preview.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/preview.yml)
```

## Troubleshooting

### "Dependencies lock file is not found"

**Problem:** No `package-lock.json` file

**Solution:**
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### "Wrangler requires at least Node.js v20.0.0"

**Problem:** Workflow is using an older Node.js version

**Solution:** Already fixed! Workflows now use Node.js v20.

**If you see this locally:**
```bash
# Check your Node.js version
node --version

# If < v20, update Node.js:
# - Download from: https://nodejs.org/
# - Or use nvm: nvm install 20 && nvm use 20
# - Or use volta: volta install node@20
```

### "Invalid API token"

**Problem:** API token is wrong or expired

**Solution:**
1. Generate new token in Cloudflare Dashboard
2. Update `CLOUDFLARE_API_TOKEN` secret in GitHub
3. Re-run workflow

### "Failed to get account ID"

**Problem:** API token doesn't have proper permissions

**Solution:**
1. Verify token has "Edit Cloudflare Workers" permission
2. Or manually add `CLOUDFLARE_ACCOUNT_ID` secret

### "Validation failed"

**Problem:** `services.json` or `wrangler.toml` has errors

**Solution:**
1. Check workflow logs for specific error
2. Test locally: `npx wrangler deploy --dry-run`
3. Validate JSON: `jq empty services.json`
4. Fix errors and push again

## Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab
2. Select **Deploy to Cloudflare Workers**
3. Click **Run workflow** dropdown
4. Select branch: `main`
5. Click **Run workflow** button

## Local Testing

Before pushing, test locally:

```bash
# Install dependencies
npm install

# Validate configuration
npx wrangler deploy --dry-run

# Validate JSON
jq empty services.json

# Test locally
npm run dev
```

## Workflow Files Explained

### Key Concepts

**`npm ci` vs `npm install`:**
- `npm ci` uses `package-lock.json` (faster, reproducible)
- `npm install` generates `package-lock.json`
- Always use `npm ci` in CI/CD

**`cache: 'npm'`:**
- Caches `node_modules` between runs
- Speeds up workflow execution
- Automatic cache invalidation on lock file change

**`--dry-run`:**
- Validates without actually deploying
- Perfect for PR validation
- Catches configuration errors early

## Best Practices

1. **Always commit `package-lock.json`**
   - Ensures reproducible builds
   - Required for `npm ci`

2. **Test locally first**
   - Run `npm run dev` to test worker
   - Run `npx wrangler deploy --dry-run` to validate

3. **Use branch protection**
   - Require PR reviews
   - Require status checks to pass
   - Prevent direct pushes to `main`

4. **Keep secrets secure**
   - Never commit API tokens
   - Rotate tokens periodically
   - Use minimal required permissions

5. **Monitor deployments**
   - Check Actions tab after push
   - Review deployment logs
   - Test deployed worker

## Cost

All workflows run within GitHub Actions free tier:
- **Public repos:** Unlimited minutes
- **Private repos:** 2,000 minutes/month free
- **Typical usage:** ~5 minutes/day

## Support

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)
- [Project README](../../README.md)
- [Deployment Guide](../../docs/DEPLOYMENT.md)
- [All Documentation](../../docs/README.md)

