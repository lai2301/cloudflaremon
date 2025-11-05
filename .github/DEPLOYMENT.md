# GitHub Actions Deployment Guide

This repository includes automated deployment workflows for Cloudflare Workers using GitHub Actions.

## Workflows

### 1. Production Deployment (`deploy.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub Actions tab

**What it does:**
- Installs dependencies
- Fetches Cloudflare Account ID (from secret or API)
- Deploys to Cloudflare Workers production

### 2. Pull Request Validation (`preview.yml`)

**Triggers:**
- Pull requests to `main` branch

**What it does:**
- Validates `services.json` syntax
- Validates `wrangler.toml` configuration (dry-run)
- Comments on PR with validation status

## Setup Instructions

### Step 1: Get Cloudflare API Token

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Edit Cloudflare Workers** template
5. Configure permissions:
   - Account → Cloudflare Workers → Edit
   - Zone → Workers Routes → Edit (if using custom domains)
6. Click **Continue to summary** → **Create Token**
7. **Copy the token** (you won't see it again!)

### Step 2: Get Cloudflare Account ID (Optional)

You have two options:

**Option A: Let GitHub Actions fetch it automatically**
- The workflow will fetch your Account ID using the API token
- No additional secret needed

**Option B: Provide it manually (recommended for faster deployments)**
1. In Cloudflare Dashboard, go to **Workers & Pages**
2. On the right sidebar, you'll see your **Account ID**
3. Click to copy it
4. Add it as a GitHub secret (see Step 3)

### Step 3: Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the required secret:

**Required Secret:**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: Your API token from Step 1

**Optional Secret (but recommended):**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: Your Account ID from Step 2
- Note: If not provided, it will be fetched automatically using the API

### Step 4: Commit and Push

```bash
git add .
git commit -m "Add GitHub Actions workflows"
git push origin main
```

The deployment will automatically trigger!

## Manual Deployment

You can manually trigger a deployment:

1. Go to **Actions** tab in your GitHub repository
2. Click **Deploy to Cloudflare Workers** workflow
3. Click **Run workflow** → **Run workflow**

## Monitoring Deployments

### View Deployment Status

1. Go to **Actions** tab
2. Click on the latest workflow run
3. View logs and deployment status

### View Deployed Worker

After successful deployment:
- Worker URL: `https://heartbeat-monitor.your-subdomain.workers.dev`
- Cloudflare Dashboard: [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers)

## Workflow Details

### Production Deploy Workflow

```yaml
Trigger: Push to main branch
Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies (npm ci)
  4. Deploy to Cloudflare Workers
```

### Preview Workflow

```yaml
Trigger: Pull request to main
Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies (npm ci)
  4. Dry-run deployment (validate only)
  5. Comment on PR with status
```

## Troubleshooting

### "Invalid API token" error

- Verify your `CLOUDFLARE_API_TOKEN` secret is correct
- Ensure the token has **Edit Cloudflare Workers** permission
- Check if the token has expired (regenerate if needed)

### "Account ID not found" error

- Verify your `CLOUDFLARE_ACCOUNT_ID` secret is correct
- Ensure you're using the Account ID, not Zone ID

### "KV namespace not found" error

- Make sure you've created the KV namespace locally first
- Update `wrangler.toml` with the correct namespace ID
- KV namespaces need to be created manually (not via GitHub Actions)

### Deployment succeeds but worker doesn't work

- Check that `services.json` is properly configured
- Verify KV namespace exists and ID is correct in `wrangler.toml`
- Review worker logs: `npx wrangler tail`

## Environment-Specific Deployments

### Multiple Environments (Production/Staging)

If you want separate staging and production environments:

1. **Create separate KV namespaces:**
```bash
# Production
npx wrangler kv:namespace create "HEARTBEAT_LOGS"

# Staging
npx wrangler kv:namespace create "HEARTBEAT_LOGS" --env staging
```

2. **Update `wrangler.toml`:**
```toml
[env.staging]
name = "heartbeat-monitor-staging"
[[env.staging.kv_namespaces]]
binding = "HEARTBEAT_LOGS"
id = "your-staging-kv-id"

[env.production]
name = "heartbeat-monitor"
[[env.production.kv_namespaces]]
binding = "HEARTBEAT_LOGS"
id = "your-production-kv-id"
```

3. **Modify workflow to use environment:**
```yaml
- name: Deploy to Staging
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    environment: 'staging'
```

## Security Best Practices

1. **Never commit API tokens** to the repository
2. **Use GitHub secrets** for all sensitive data
3. **Rotate API tokens** periodically
4. **Use scoped tokens** with minimal required permissions
5. **Review deployment logs** for any security issues
6. **Enable branch protection** on `main` branch
7. **Require PR reviews** before merging

## Branch Protection (Recommended)

Configure branch protection for `main`:

1. Go to **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass (Preview Deployment)
   - ✅ Require branches to be up to date
   - ✅ Do not allow bypassing the above settings

This ensures:
- All changes go through PR review
- Preview deployment validates changes
- No accidental direct pushes to production

## Custom Domains

If you're using a custom domain:

1. **Add route in `wrangler.toml`:**
```toml
routes = [
  { pattern = "monitor.yourdomain.com", custom_domain = true }
]
```

2. **Ensure API token has Zone permissions:**
   - Zone → Workers Routes → Edit

3. **Configure DNS in Cloudflare Dashboard**

## Rollback

To rollback a deployment:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click your worker
3. Go to **Deployments** tab
4. Click **...** on a previous version
5. Click **Rollback to this deployment**

Or via CLI:
```bash
npx wrangler rollback
```

## Cost Considerations

GitHub Actions usage:
- **Free tier**: 2,000 minutes/month for private repos
- **Public repos**: Unlimited minutes
- Typical deployment: ~1-2 minutes

Each deployment is fast and well within free tier limits!

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler GitHub Action](https://github.com/cloudflare/wrangler-action)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

**Need help?** Check the logs in GitHub Actions tab or run `npx wrangler tail` to debug the worker.

