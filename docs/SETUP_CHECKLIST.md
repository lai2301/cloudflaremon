# Pre-Deployment Checklist

Before pushing to GitHub and triggering deployment, verify these steps:

## ✅ Required Setup Steps

### 1. KV Namespace Created and Configured

**Status:** ✅ Auto-Created (No Action Required!)

**🎉 Fully Automated!**

The GitHub Actions deployment workflow automatically creates the KV namespace using Terraform on first deployment.

**You can skip this entirely!** Just push your code and the workflow handles it.

<details>
<summary>💡 Optional: Manual creation for local testing (click to expand)</summary>

Only needed if you want to test locally before pushing to GitHub:

```bash
# Option 1: Let GitHub Actions handle it (Recommended)
# Just skip this and push to GitHub!

# Option 2: Manual with Wrangler CLI (for local testing)
npx wrangler kv:namespace create "HEARTBEAT_LOGS"
# Then update wrangler.toml with the ID from output
```

</details>

**What will happen automatically:**
- ✅ Terraform creates KV namespace on first deployment
- ✅ `wrangler.toml` gets updated automatically
- ✅ Changes committed back to repo
- ✅ Worker deploys successfully

---

### 2. GitHub Secrets Configured

**Status:** ⬜ Not Done | ⬜ Done

**What to check:**
- [ ] Created Cloudflare API Token
- [ ] Added `CLOUDFLARE_API_TOKEN` to GitHub secrets
- [ ] Optionally added `CLOUDFLARE_ACCOUNT_ID` to GitHub secrets

**Where to check:**
```
GitHub Repo → Settings → Secrets and variables → Actions
```

---

### 3. Services Configured

**Status:** ⬜ Not Done | ⬜ Done

**What to check:**
- [ ] Updated `services.json` with your actual services
- [ ] Changed service IDs from example values
- [ ] Generated strong API keys (not `your-secret-key-1`)
- [ ] Set appropriate `stalenessThreshold` values

**Generate secure API keys:**
```bash
# Generate a random API key
openssl rand -hex 32
```

---

### 4. Package Lock File Exists

**Status:** ⬜ Not Done | ⬜ Done

**Commands:**
```bash
# Check if it exists
ls -la package-lock.json

# If not, create it
npm install
```

---

### 5. Local Testing Done

**Status:** ⬜ Not Done | ⬜ Done

**What to check:**
- [ ] Ran `npm install` successfully
- [ ] Tested with `npm run dev` (optional but recommended)
- [ ] Validated configuration: `npx wrangler deploy --dry-run`

---

## 🚀 Ready to Deploy?

If all items above are checked, you're ready to deploy!

```bash
# Review what will be committed
git status

# Add files
git add .

# Commit
git commit -m "Initial deployment with KV namespace configured"

# Push to trigger deployment
git push origin main
```

## 🔍 Post-Deployment Verification

After pushing, verify:

1. **GitHub Actions Status**
   - Go to: GitHub Repo → Actions tab
   - Check that "Deploy to Cloudflare Workers" succeeds (green ✓)

2. **Worker URL**
   - Check deployment logs for worker URL
   - Visit: `https://heartbeat-monitor.your-subdomain.workers.dev`
   - You should see the dashboard

3. **Test Heartbeat**
   ```bash
   curl -X POST https://your-worker.workers.dev/api/heartbeat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-api-key" \
     -d '{"serviceId": "service-1", "status": "up"}'
   ```
   - Should return: `{"success":true,...}`

4. **Set Up Heartbeat Clients**
   - Copy example scripts to your internal services
   - Configure with your worker URL and API keys
   - Schedule with cron or systemd

## ❌ Common Issues

### Deployment Fails with "KV namespace is not valid"

**You forgot to update the KV namespace ID!**

Fix:
```bash
# Create namespace
npx wrangler kv:namespace create "HEARTBEAT_LOGS"

# Update wrangler.toml with the real ID
# Then commit and push again
```

### Deployment Succeeds but Worker Returns 500

**Possible causes:**
- KV namespace not accessible
- `services.json` has invalid JSON

Fix:
```bash
# Validate JSON
jq empty services.json

# Check worker logs
npx wrangler tail
```

### GitHub Actions Shows "Authentication Error"

**Your API token is missing or invalid**

Fix:
1. Generate new token in Cloudflare Dashboard
2. Update `CLOUDFLARE_API_TOKEN` secret in GitHub
3. Re-run the workflow

---

## 📚 Need Help?

- [Deployment Guide](.github/DEPLOYMENT.md)
- [Workflow Documentation](.github/workflows/README.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Main README](../README.md)

