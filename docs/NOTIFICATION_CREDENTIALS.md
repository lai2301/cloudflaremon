# Notification Credentials Setup

## 🔒 Security Best Practice

**IMPORTANT**: Never store sensitive credentials (API keys, tokens, webhook URLs) in `notifications.json`!

All sensitive credentials should be stored as **Cloudflare Worker environment variables** (secrets).

## How It Works

The notification system automatically reads credentials from environment variables using this naming convention:

```
NOTIFICATION_{CHANNEL_NAME}_{CREDENTIAL_KEY}
```

Where:
- `{CHANNEL_NAME}` is the channel name from `notifications.json` (uppercase, special chars replaced with `_`)
- `{CREDENTIAL_KEY}` is the credential field name (uppercase)

### Example

For a channel named `"Discord Webhook"` that needs a `webhookUrl`:

**Environment Variable Name**:
```
NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
```

## Setting Up Credentials

### Method 1: Using Wrangler CLI (Recommended)

```bash
# Discord
npx wrangler secret put NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
# Then paste: https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN

# Slack
npx wrangler secret put NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL
# Then paste: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Telegram
npx wrangler secret put NOTIFICATION_TELEGRAM_BOT_BOTTOKEN
npx wrangler secret put NOTIFICATION_TELEGRAM_BOT_CHATID

# Email (Mailgun)
npx wrangler secret put NOTIFICATION_EMAIL_VIA_MAILGUN_APIKEY
npx wrangler secret put NOTIFICATION_EMAIL_VIA_MAILGUN_DOMAIN

# Custom Webhook
npx wrangler secret put NOTIFICATION_CUSTOM_WEBHOOK_URL
npx wrangler secret put NOTIFICATION_CUSTOM_WEBHOOK_AUTHTOKEN

# Pushover
npx wrangler secret put NOTIFICATION_PUSHOVER_USERKEY
npx wrangler secret put NOTIFICATION_PUSHOVER_APITOKEN

# PagerDuty
npx wrangler secret put NOTIFICATION_PAGERDUTY_ROUTINGKEY
```

### Method 2: Using GitHub Secrets (for CI/CD)

**✅ Automatic Setup**: Our GitHub Actions workflow automatically configures notification secrets during deployment!

#### Step 1: Add Secrets to GitHub Repository

Go to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add any of these secrets (only add the ones you need):

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` | Discord webhook URL | Discord notifications |
| `NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL` | Slack webhook URL | Slack notifications |
| `NOTIFICATION_TELEGRAM_BOT_BOTTOKEN` | Telegram bot token | Telegram notifications |
| `NOTIFICATION_TELEGRAM_BOT_CHATID` | Telegram chat ID | Telegram notifications |
| `NOTIFICATION_EMAIL_VIA_MAILGUN_APIKEY` | Mailgun API key | Email notifications |
| `NOTIFICATION_EMAIL_VIA_MAILGUN_DOMAIN` | Mailgun domain | Email notifications |
| `NOTIFICATION_CUSTOM_WEBHOOK_URL` | Custom webhook URL | Custom webhooks |
| `NOTIFICATION_CUSTOM_WEBHOOK_AUTHTOKEN` | Custom auth token | Custom webhooks |
| `NOTIFICATION_PUSHOVER_USERKEY` | Pushover user key | Pushover notifications |
| `NOTIFICATION_PUSHOVER_APITOKEN` | Pushover API token | Pushover notifications |
| `NOTIFICATION_PAGERDUTY_ROUTINGKEY` | PagerDuty routing key | PagerDuty notifications |

#### Step 2: Deploy

The workflow (`.github/workflows/deploy.yml`) automatically:
1. Deploys your worker
2. Checks which notification secrets are configured
3. Sets them on your Cloudflare Worker using `wrangler secret put`

**Example workflow output:**
```
🔔 Configuring notification secrets...
✅ Discord webhook configured
✅ Slack webhook configured
✅ Telegram bot token configured
✅ Telegram chat ID configured
✨ Notification secrets configuration complete
```

#### How It Works

The workflow includes a step after deployment:

```yaml
- name: Configure Notification Secrets
  run: |
    # Discord
    if [[ -n "${{ secrets.NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL }}" ]]; then
      echo "${{ secrets.NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL }}" | npx wrangler secret put NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
    fi
    # ... (checks and sets all other secrets)
```

**Note**: The workflow only configures secrets that you've added to GitHub Secrets. If a secret isn't set, it's skipped.

#### Quick Setup Guide

1. **Add Discord notification to GitHub Secrets**:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL`
   - Value: `https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN`
   - Click "Add secret"

2. **Enable Discord in notifications.json**:
   ```json
   {
     "type": "discord",
     "name": "Discord Webhook",
     "enabled": true,
     "config": {},
     "events": ["down", "up"]
   }
   ```

3. **Commit and push**:
   ```bash
   git add notifications.json
   git commit -m "Enable Discord notifications"
   git push origin main
   ```

4. **Watch the deployment**:
   - Go to your repo → Actions tab
   - Watch the "Deploy to Cloudflare Workers" workflow
   - Look for "🔔 Configuring notification secrets..." in the logs
   - Should see "✅ Discord webhook configured"

5. **Test it**:
   ```bash
   curl -X POST https://your-worker.workers.dev/api/test-notification \
     -H "Content-Type: application/json" \
     -d '{"channelType":"discord","eventType":"down"}'
   ```

**✨ That's it!** Your notification secrets are now automatically deployed every time you push to main.

### Method 3: Using Cloudflare Dashboard

1. Go to **Workers & Pages**
2. Select your worker
3. Go to **Settings** → **Variables**
4. Click **Add variable**
5. Select **Encrypt** for sensitive values
6. Add each credential as a variable

## Per-Channel Setup

### Discord

**Environment Variables:**
```bash
NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
```

**notifications.json:**
```json
{
  "type": "discord",
  "name": "Discord Webhook",
  "enabled": true,
  "config": {},
  "events": ["down", "up"]
}
```

**Setup:**
1. Go to Discord Server Settings → Integrations → Webhooks
2. Create webhook and copy URL
3. Set as environment variable

### Slack

**Environment Variables:**
```bash
NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL
```

**notifications.json:**
```json
{
  "type": "slack",
  "name": "Slack Webhook",
  "enabled": true,
  "config": {},
  "events": ["down", "up"]
}
```

**Setup:**
1. Go to https://api.slack.com/apps
2. Create app → Incoming Webhooks
3. Copy webhook URL
4. Set as environment variable

### Telegram

**Environment Variables:**
```bash
NOTIFICATION_TELEGRAM_BOT_BOTTOKEN
NOTIFICATION_TELEGRAM_BOT_CHATID
```

**notifications.json:**
```json
{
  "type": "telegram",
  "name": "Telegram Bot",
  "enabled": true,
  "config": {},
  "events": ["down", "up", "degraded"]
}
```

**Setup:**
1. Message @BotFather → `/newbot`
2. Copy bot token
3. Add bot to channel/group
4. Get chat ID from @userinfobot
5. Set both as environment variables

### Email (Mailgun)

**Environment Variables:**
```bash
NOTIFICATION_EMAIL_VIA_MAILGUN_APIKEY
NOTIFICATION_EMAIL_VIA_MAILGUN_DOMAIN
```

**notifications.json:**
```json
{
  "type": "email",
  "name": "Email via Mailgun",
  "enabled": true,
  "config": {
    "provider": "mailgun",
    "from": "alerts@yourdomain.com",
    "to": ["admin@yourdomain.com"]
  },
  "events": ["down", "up"]
}
```

**Setup:**
1. Sign up at https://mailgun.com
2. Verify your domain
3. Get API key and domain name
4. Set as environment variables
5. Configure `from` and `to` in notifications.json (these are not sensitive)

### Custom Webhook

**Environment Variables:**
```bash
NOTIFICATION_CUSTOM_WEBHOOK_URL
NOTIFICATION_CUSTOM_WEBHOOK_AUTHTOKEN  # If using Bearer token
```

**notifications.json:**
```json
{
  "type": "webhook",
  "name": "Custom Webhook",
  "enabled": true,
  "config": {
    "method": "POST",
    "headers": {}
  },
  "events": ["down", "up", "degraded"]
}
```

**Setup:**
1. Get your webhook URL
2. Get authentication token if required
3. Set as environment variables
4. Configure method and headers in notifications.json

### Pushover

**Environment Variables:**
```bash
NOTIFICATION_PUSHOVER_USERKEY
NOTIFICATION_PUSHOVER_APITOKEN
```

**notifications.json:**
```json
{
  "type": "pushover",
  "name": "Pushover",
  "enabled": true,
  "config": {},
  "events": ["down", "up"]
}
```

**Setup:**
1. Sign up at https://pushover.net
2. Create application
3. Get user key and API token
4. Set as environment variables

### PagerDuty

**Environment Variables:**
```bash
NOTIFICATION_PAGERDUTY_ROUTINGKEY
```

**notifications.json:**
```json
{
  "type": "pagerduty",
  "name": "PagerDuty",
  "enabled": true,
  "config": {},
  "events": ["down", "up"]
}
```

**Setup:**
1. Go to PagerDuty → Services
2. Add Events API V2 integration
3. Copy integration key (routing key)
4. Set as environment variable

## Environment Variable Name Reference

| Channel | Credential | Environment Variable Name |
|---------|------------|---------------------------|
| Discord Webhook | webhookUrl | `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL` |
| Slack Webhook | webhookUrl | `NOTIFICATION_SLACK_WEBHOOK_WEBHOOKURL` |
| Telegram Bot | botToken | `NOTIFICATION_TELEGRAM_BOT_BOTTOKEN` |
| Telegram Bot | chatId | `NOTIFICATION_TELEGRAM_BOT_CHATID` |
| Email via Mailgun | apiKey | `NOTIFICATION_EMAIL_VIA_MAILGUN_APIKEY` |
| Email via Mailgun | domain | `NOTIFICATION_EMAIL_VIA_MAILGUN_DOMAIN` |
| Custom Webhook | url | `NOTIFICATION_CUSTOM_WEBHOOK_URL` |
| Custom Webhook | authToken | `NOTIFICATION_CUSTOM_WEBHOOK_AUTHTOKEN` |
| Pushover | userKey | `NOTIFICATION_PUSHOVER_USERKEY` |
| Pushover | apiToken | `NOTIFICATION_PUSHOVER_APITOKEN` |
| PagerDuty | routingKey | `NOTIFICATION_PAGERDUTY_ROUTINGKEY` |

## Verifying Configuration

### Check Environment Variables

```bash
# List all secrets (shows names only, not values)
npx wrangler secret list
```

### Test Notifications

```bash
# Test with curl
curl -X POST https://your-worker.workers.dev/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"channelType":"discord","eventType":"down"}'

# Or use the test script
cd examples
./test-notification.sh
```

### Check Worker Logs

```bash
npm run tail
```

Look for log messages like:
```
✓ Credential loaded from environment: NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
✓ Sending notification to Discord Webhook
```

## Migration from Old Config

If you have credentials in your old `notifications.json`:

### Step 1: Extract Credentials

From:
```json
{
  "type": "discord",
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/123/ABC"
  }
}
```

To environment variable:
```bash
NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL=https://discord.com/api/webhooks/123/ABC
```

### Step 2: Update notifications.json

```json
{
  "type": "discord",
  "config": {}
}
```

### Step 3: Set Environment Variables

```bash
npx wrangler secret put NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL
# Paste: https://discord.com/api/webhooks/123/ABC
```

### Step 4: Deploy

```bash
npm run deploy
```

### Step 5: Test

```bash
cd examples
./test-notification.sh
```

## Troubleshooting

### "Webhook URL not configured" Error

**Cause**: Environment variable not set or name doesn't match

**Solution**:
1. Check the channel name in `notifications.json` (e.g., "Discord Webhook")
2. Convert to env var name: `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL`
3. Set the environment variable
4. Redeploy the worker

### Credentials Still in Config File

**Problem**: You set environment variables but credentials are still in `notifications.json`

**Solution**: The system checks environment variables first, then falls back to config. Remove credentials from `notifications.json` for security.

### Different Channel Names

If you rename a channel in `notifications.json`, you need to update the environment variable name:

**Old**:
```json
{"name": "Discord Webhook"}
```
Env var: `NOTIFICATION_DISCORD_WEBHOOK_WEBHOOKURL`

**New**:
```json
{"name": "Production Discord"}
```
Env var: `NOTIFICATION_PRODUCTION_DISCORD_WEBHOOKURL`

## Security Checklist

- [ ] All sensitive credentials stored as environment variables
- [ ] `notifications.json` contains no secrets
- [ ] Environment variables set in Cloudflare Workers
- [ ] GitHub secrets configured for CI/CD
- [ ] Tested notifications work with environment variables
- [ ] Old credentials removed from `notifications.json`
- [ ] `notifications.json` added to `.gitignore` if it contains any sensitive data
- [ ] Team members know to use environment variables
- [ ] Documented which environment variables are needed

## Related Documentation

- [Notification System Guide](NOTIFICATIONS.md)
- [Quick Reference](NOTIFICATIONS_QUICK_REFERENCE.md)
- [Security Guide](SECURITY.md)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

---

**🔒 Keep your credentials safe! Always use environment variables for sensitive data.**

