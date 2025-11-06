# GitHub Actions Deployment Setup

## 🚀 Quick Start

This guide shows you how to set up automatic deployment and secret management using GitHub Actions.

## Prerequisites

- GitHub repository with your code
- Cloudflare account
- Cloudflare API token with Workers permissions

## Step-by-Step Setup

### 1. Add Required GitHub Secrets

Go to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Required Secrets

| Secret Name | How to Get It | Description |
|-------------|---------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token | API token with Workers edit permissions |
| `API_KEYS` | Generate with `openssl rand -base64 32` | JSON object: `{"service-1":"key1","service-2":"key2"}` |

#### Optional: Notification Secrets

Only add the ones you need:

| Secret Name | How to Get It |
|-------------|---------------|
| `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` | Discord Server Settings → Integrations → Webhooks |
| `NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL` | Slack API → Incoming Webhooks |
| `NOTIFICATION_TELEGRAM_BOT_BOTTOKEN` | Telegram @BotFather → `/newbot` |
| `NOTIFICATION_TELEGRAM_BOT_CHATID` | Telegram @userinfobot |
| `NOTIFICATION_EMAIL_VIA_MAILGUN_APIKEY` | Mailgun Dashboard → API Keys |
| `NOTIFICATION_EMAIL_VIA_MAILGUN_DOMAIN` | Mailgun Dashboard → Domains |
| `NOTIFICATION_CUSTOM_WEBHOOK_URL` | Your webhook endpoint |
| `NOTIFICATION_CUSTOM_WEBHOOK_AUTHTOKEN` | Your auth token |
| `NOTIFICATION_PUSHOVER_USERKEY` | Pushover Dashboard |
| `NOTIFICATION_PUSHOVER_APITOKEN` | Pushover Dashboard |
| `NOTIFICATION_PAGERDUTY_ROUTINGKEY` | PagerDuty Service → Integrations |

### 2. Configure Your Worker

Make sure your configuration files are set up:

**services.json**:
```json
{
  "services": [
    {
      "id": "service-1",
      "name": "My Service",
      "enabled": true,
      "stalenessThreshold": 300,
      "notifications": {
        "enabled": true,
        "channels": ["discord"],
        "events": ["down", "up"]
      }
    }
  ]
}
```

**notifications.json**:
```json
{
  "enabled": true,
  "channels": [
    {
      "type": "discord",
      "name": "Discord Webhook",
      "enabled": true,
      "config": {},
      "events": ["down", "up"]
    }
  ]
}
```

**Note**: Keep `config: {}` empty - credentials come from GitHub Secrets!

### 3. Push to GitHub

```bash
git add .
git commit -m "Setup monitoring with notifications"
git push origin main
```

### 4. Watch the Magic Happen 🎉

1. Go to your repository → **Actions** tab
2. Click on the running "Deploy to Cloudflare Workers" workflow
3. Watch the deployment progress

**You should see:**
```
✅ KV namespace configured
✅ Worker deployed
🔐 Configuring worker secrets...
✅ API_KEYS configured
🔔 Configuring notification secrets...
✅ Discord webhook configured
✅ Slack webhook configured
✨ Notification secrets configuration complete
```

### 5. Verify Deployment

Test your notifications:

```bash
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"discord","eventType":"down"}'
```

Check your Discord/Slack/Telegram for the test message!

## What Happens During Deployment

### Workflow Steps

1. **Checkout code** - Gets your latest code
2. **Setup Node.js** - Installs Node.js 20
3. **Install dependencies** - Runs `npm ci`
4. **Fetch Account ID** - Gets your Cloudflare account ID
5. **Check KV namespace** - Creates KV namespace if needed (via Terraform)
6. **Deploy worker** - Deploys your worker code
7. **Configure secrets** - Sets all your secrets on the worker

### Secret Configuration

The workflow automatically:
- ✅ Checks which secrets you've configured
- ✅ Only sets secrets that exist (skips missing ones)
- ✅ Uses `wrangler secret put` to securely set them
- ✅ Never exposes secret values in logs

## Adding More Secrets Later

Want to add a new notification channel?

1. **Add the GitHub Secret**:
   - Settings → Secrets → New secret
   - Name: `NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL`
   - Value: Your Slack webhook URL

2. **Enable in notifications.json**:
   ```json
   {
     "type": "slack",
     "enabled": true,
     "config": {},
     "events": ["down", "up"]
   }
   ```

3. **Push to trigger deployment**:
   ```bash
   git add notifications.json
   git commit -m "Add Slack notifications"
   git push origin main
   ```

4. **Done!** The workflow will automatically configure the new secret.

## Updating Secrets

To update an existing secret:

1. Go to Settings → Secrets → Actions
2. Find the secret (e.g., `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL`)
3. Click **Update**
4. Enter new value
5. Push any commit to trigger redeployment (or manually trigger workflow)

The workflow will update the secret on your worker.

## Troubleshooting

### "API_KEYS not set" Warning

**Problem**: You see `⚠️ API_KEYS not set` in workflow logs

**Solution**: 
1. Go to Settings → Secrets → Actions
2. Add secret `API_KEYS`
3. Value should be JSON: `{"service-1":"generated-key-1","service-2":"generated-key-2"}`
4. Generate keys with: `openssl rand -base64 32`

### Notification Not Working

**Problem**: Notification secret is set but channel not working

**Checklist**:
- ✅ Secret name matches exactly (case-sensitive)
- ✅ Channel is `enabled: true` in notifications.json
- ✅ Webhook URL / token is correct
- ✅ Workflow ran successfully (check Actions tab)
- ✅ Test notification: `curl -X POST .../api/test-notification`

### Workflow Fails

**Problem**: GitHub Actions workflow fails

**Common Issues**:
1. **No CLOUDFLARE_API_TOKEN**: Add it to GitHub Secrets
2. **API token has wrong permissions**: Needs Workers edit permissions
3. **Syntax error in JSON**: Validate services.json and notifications.json
4. **KV namespace issue**: Check Terraform logs in workflow

### Check Worker Logs

```bash
npm run tail
```

Or in Cloudflare Dashboard:
Workers & Pages → Your Worker → Logs

## Security Best Practices

✅ **DO:**
- Store all credentials as GitHub Secrets
- Use separate secrets for different environments (dev/prod)
- Rotate secrets regularly
- Use API tokens with minimal required permissions
- Review secret access logs

❌ **DON'T:**
- Commit secrets to git
- Share secrets in chat/email
- Use production secrets in development
- Give tokens more permissions than needed
- Leave unused secrets configured

## Advanced: Multiple Environments

Want separate dev and production environments?

### Setup

1. Create separate GitHub repositories or branches
2. Use different GitHub Secrets for each environment
3. Configure different notification channels per environment

**Dev secrets**:
- `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` → Dev Discord channel

**Prod secrets**:
- `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` → Prod Discord channel
- `NOTIFICATION_PAGERDUTY_ROUTINGKEY` → Production PagerDuty

### Using Branch-Based Environments

Modify `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main      # Production
      - develop   # Development

jobs:
  setup-and-deploy:
    environment:
      name: ${{ github.ref_name == 'main' && 'production' || 'development' }}
```

Then configure environment-specific secrets in:
Settings → Environments → Production/Development → Add secret

## Related Documentation

- **[Notification Credentials](NOTIFICATION_CREDENTIALS.md)** - Detailed credential setup
- **[Security Guide](SECURITY.md)** - API key management
- **[Deployment Guide](DEPLOYMENT.md)** - Full deployment documentation
- **[Notifications Guide](NOTIFICATIONS.md)** - Notification system setup

## Quick Reference

### Secret Naming Convention

```
NOTIFICATION_{CHANNEL_NAME}_{CREDENTIAL_KEY}
```

Example:
- Channel name: "Discord Webhook"
- Credential: "webhookUrl"
- Secret name: `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL`

### Generate Strong Keys

```bash
# For API_KEYS
openssl rand -base64 32

# For multiple services
for i in {1..3}; do
  echo "service-$i: $(openssl rand -base64 32)"
done
```

### Test Workflow Locally

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or: https://github.com/nektos/act

# Run workflow locally (secrets required)
act -s CLOUDFLARE_API_TOKEN=your-token \
    -s API_KEYS='{"service-1":"key1"}'
```

---

**🎉 You're all set!** Every push to main will now automatically deploy your worker with all secrets configured.

