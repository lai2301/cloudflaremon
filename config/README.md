# Configuration Files

This directory contains all configuration files for the Cloudflare Heartbeat Monitor.

## 📁 Files

### `services.json` ⭐ **Required**
Defines the services and groups to monitor.

**Contents:**
- Service definitions (ID, name, description, staleness threshold)
- Group definitions (for organizing services)
- Authentication settings (per-service or per-group)

**Example:** See [`examples/services.example.json`](../examples/services.example.json)

**Documentation:** [Authentication Configuration](../docs/AUTH_CONFIGURATION.md)

---

### `dashboard.json` ⭐ **Required**
Controls the dashboard UI appearance and branding.

**Contents:**
- Branding (title, subtitle, logo)
- Theme colors (light and dark mode)
- Status indicators and icons
- Display preferences

**Example:** See [`examples/dashboard.example.json`](../examples/dashboard.example.json)

**Documentation:** [UI Customization Guide](../docs/UI_CUSTOMIZATION.md)

---

### `settings.json` ⭐ **Required**
Feature toggles and behavior settings.

**Contents:**
- Feature flags (CSV export, auto-refresh)
- Uptime calculation settings
- Retention policies
- Behavior configuration

**Example:** See [`examples/settings.example.json`](../examples/settings.example.json)

---

### `notifications.json` ⭐ **Required**
Alert notification configuration for all channels.

**Contents:**
- Notification channels (Discord, Slack, Email, etc.)
- Alert routing and filtering
- Notification templates
- Alert history housekeeping

**Example:** See [`examples/notifications.example.json`](../examples/notifications.example.json)

**Documentation:** 
- [Notifications Guide](../docs/NOTIFICATIONS.md)
- [Notification Templates](../docs/NOTIFICATION_TEMPLATES.md)
- [Alert History Housekeeping](../docs/ALERT_HISTORY_HOUSEKEEPING.md)

---

### `ui.json` ⚠️ **Deprecated**
Legacy configuration file (kept for backward compatibility).

**Status:** Deprecated - use `dashboard.json` + `settings.json` instead

**Migration:** The system automatically falls back to `ui.json` if `dashboard.json` is missing, but you should migrate to the new split structure.

---

## 📝 File Locations

**Important:** All configuration files are in the `config/` directory. Always reference them with the full path:

✅ **Good:** `config/services.json`  
❌ **Bad:** `services.json`

### In Documentation
```markdown
Edit `config/services.json` to add your services.
```

### In Code (from `src/` directory)
```javascript
import servicesConfig from '../config/services.json';
```

### In Scripts
```bash
cat config/services.json
```

---

## 🚀 Quick Start

### 1. Copy Example Files

```bash
cp examples/services.example.json config/services.json
cp examples/dashboard.example.json config/dashboard.json
cp examples/settings.example.json config/settings.json
cp examples/notifications.example.json config/notifications.json
```

### 2. Edit Configuration

Edit each file to match your setup:

```bash
# Edit services
nano config/services.json

# Edit dashboard appearance
nano config/dashboard.json

# Edit feature settings
nano config/settings.json

# Edit notifications
nano config/notifications.json
```

### 3. Validate Configuration

```bash
# Validate JSON syntax
for file in config/*.json; do
  echo "Checking $file..."
  jq empty "$file" && echo "✅ Valid" || echo "❌ Invalid"
done
```

---

## 🔒 Security Notes

### Sensitive Data

**Configuration files should NOT contain secrets!**

❌ **Never put in config files:**
- API keys
- Passwords
- Auth tokens
- Webhook URLs (if they contain secrets)

✅ **Use environment variables instead:**
- Set secrets via `npx wrangler secret put`
- Reference them in code via `env.API_KEYS`, etc.
- See [Security Guide](../docs/SECURITY.md)

### Safe to Commit

These config files are safe to commit to Git:
- ✅ `services.json` - No secrets
- ✅ `dashboard.json` - No secrets
- ✅ `settings.json` - No secrets
- ✅ `notifications.json` - Channel structure only, no credentials

**Credentials are stored separately as Worker secrets.**

---

## 📖 Documentation

### Configuration Guides
- 📘 [Quick Start Guide](../docs/QUICKSTART.md)
- 📗 [Setup Checklist](../docs/SETUP_CHECKLIST.md)
- 📙 [Authentication Configuration](../docs/AUTH_CONFIGURATION.md)
- 📕 [UI Customization](../docs/UI_CUSTOMIZATION.md)

### Feature-Specific
- 🔔 [Notifications](../docs/NOTIFICATIONS.md)
- 🔐 [Security](../docs/SECURITY.md)
- 🚀 [Deployment](../docs/DEPLOYMENT.md)
- 🏗️ [Architecture](../docs/ARCHITECTURE.md)

---

## 🆘 Troubleshooting

### Configuration Not Loading

**Symptoms:**
- Dashboard shows default/placeholder content
- Services not appearing
- Features not working

**Fixes:**
1. **Check file location:** Files must be in `config/` directory
2. **Validate JSON:** Use `jq empty config/*.json`
3. **Check imports:** Verify `src/config/loader.js` paths
4. **Redeploy:** `npx wrangler deploy`

### Validation Errors in GitHub Actions

**Symptoms:**
- PR validation fails
- "Missing config files" error

**Fixes:**
1. **Ensure all required files exist:**
   ```bash
   ls -la config/
   # Should show: services.json, dashboard.json, settings.json, notifications.json
   ```
2. **Validate JSON syntax locally:**
   ```bash
   jq empty config/services.json
   ```
3. **Check GitHub workflow:** `.github/workflows/preview.yml` should reference `config/` paths

---

## 🔄 Migration from Old Structure

If you have config files in the root directory, move them:

```bash
# Old structure (pre-refactoring)
./services.json
./notifications.json
./ui.json

# New structure (current)
config/services.json
config/notifications.json
config/dashboard.json
config/settings.json
config/ui.json (legacy)
```

**Migration steps:**
1. Move files to `config/` directory
2. Update any custom scripts that reference them
3. Redeploy the worker
4. Update documentation if you've customized it

---

## 📦 Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 2025-11 | Refactored: Split `ui.json` → `dashboard.json` + `settings.json`, Moved all configs to `config/` directory |
| v1.0 | 2025-09 | Initial structure with files in root |

---

## 💡 Tips

### JSON Validation
Use `jq` to validate and format:
```bash
jq . config/services.json
```

### Environment-Specific Configs
Use different configs per environment:
```bash
# Production
ln -s config.prod/services.json config/services.json

# Staging
ln -s config.staging/services.json config/services.json
```

### Version Control
Track config changes:
```bash
git log --follow config/services.json
```

---

**Questions?** Check the [main documentation](../docs/) or open an issue!

