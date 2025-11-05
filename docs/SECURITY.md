# Security Guide

Comprehensive security configuration for the Cloudflare Heartbeat Monitor.

## Table of Contents

- [Built-in Security Features](#built-in-security-features)
- [Rate Limiting](#rate-limiting)
- [Dashboard Authentication](#dashboard-authentication)
- [Cloudflare Access Integration](#cloudflare-access-integration)
- [API Key Protection](#api-key-protection)
- [DDoS Protection](#ddos-protection)
- [Best Practices](#best-practices)

## Built-in Security Features

### ✅ Already Implemented

1. **API Key Authentication** - Heartbeat endpoint requires API keys
2. **Rate Limiting** - Automatic rate limiting (100 req/min per IP)
3. **Cloudflare DDoS Protection** - Built-in at the edge
4. **HTTPS Only** - All traffic encrypted
5. **Input Validation** - All inputs validated

## Rate Limiting

### Automatic Rate Limiting

The worker now includes automatic rate limiting:

- **Limit**: 100 requests per minute per IP address
- **Applies to**: Dashboard and API endpoints (except `/api/heartbeat`)
- **Storage**: Uses KV with automatic expiration
- **Response**: HTTP 429 with `Retry-After` header

### Configuration

Edit `src/index.js` to adjust rate limits:

```javascript
// Rate limit: 100 requests per minute per IP
const limit = 100;
const window = 60; // seconds
```

### How It Works

```
Request → Check IP → Count requests in last 60s
          ↓
          Is count < 100?
          ↓
    Yes → Allow (200)
    No  → Deny (429 with Retry-After)
```

## Dashboard Authentication

### Option 1: Basic Authentication (Simple)

The worker includes built-in basic auth support.

#### Enable Basic Auth

1. **Uncomment the auth check** in `src/index.js`:

```javascript
async function handleDashboard(env, request) {
  // Uncomment these lines:
  const authResult = await checkDashboardAuth(request, env);
  if (!authResult.authorized) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Heartbeat Monitor Dashboard"'
      }
    });
  }
  
  // ... rest of function
}
```

2. **Add password to wrangler.toml**:

```toml
[vars]
DASHBOARD_PASSWORD = "your-secure-password-here"
```

Or use Wrangler secrets (more secure):

```bash
npx wrangler secret put DASHBOARD_PASSWORD
# Enter your password when prompted
```

3. **Deploy**:

```bash
npm run deploy
```

Now the dashboard will prompt for credentials:
- **Username**: (any value)
- **Password**: Your configured password

### Option 2: Cloudflare Access (Advanced)

Cloudflare Access provides enterprise-grade authentication with SSO, MFA, and more.

#### Setup Cloudflare Access

1. **Enable Cloudflare Access** in your Cloudflare dashboard:
   - Go to Zero Trust → Access → Applications
   - Click "Add an application"
   - Select "Self-hosted"

2. **Configure Application**:
   ```
   Application name: Heartbeat Monitor Dashboard
   Session duration: 24 hours
   Application domain: heartbeat-monitor.your-subdomain.workers.dev
   ```

3. **Add Policies**:
   
   **Policy 1: Allow Specific Emails**
   ```
   Name: Authorized Users
   Action: Allow
   Rule: 
     - Include → Emails → yourname@example.com
   ```

   **Policy 2: Allow IP Range (Optional)**
   ```
   Name: Office Network
   Action: Allow
   Rule:
     - Include → IP ranges → 203.0.113.0/24
   ```

4. **Identity Providers**:
   
   Configure at least one:
   - Google Workspace
   - Azure AD
   - GitHub
   - One-time PIN (email)

5. **Save and Deploy**

#### Bypass Rules for Heartbeat Endpoint

Important: Heartbeat endpoint (`/api/heartbeat`) should NOT be protected by Access.

Add a bypass rule:

```
Policy: Bypass
Path: /api/heartbeat
Action: Bypass
```

This allows internal services to send heartbeats without authentication.

#### Access Configuration Example

```yaml
# Cloudflare Access Configuration (via Dashboard)

Application:
  name: heartbeat-monitor-dashboard
  domain: heartbeat-monitor.your-subdomain.workers.dev
  type: self_hosted
  
Policies:
  - name: Allow Admins
    decision: allow
    include:
      - email: admin@example.com
      - email: devops@example.com
      
  - name: Bypass Heartbeat
    decision: bypass
    include:
      - path: /api/heartbeat
      - path: /api/status
```

### Option 3: IP Allowlist

Restrict access to specific IP addresses.

#### Using Cloudflare WAF

1. Go to **Security** → **WAF** → **Custom rules**
2. Create rule:

```
Rule name: Allow Only Office IPs
Field: IP Address
Operator: does not equal
Value: 203.0.113.0/24
Action: Block
```

#### Using Worker Code

Add to `src/index.js`:

```javascript
// IP allowlist
const ALLOWED_IPS = [
  '203.0.113.0/24',  // Office network
  '198.51.100.50',   // VPN IP
];

function isIPAllowed(ip) {
  // Implement IP checking logic
  return ALLOWED_IPS.some(range => ipInRange(ip, range));
}

async function handleDashboard(env, request) {
  const clientIP = request.headers.get('CF-Connecting-IP');
  
  if (!isIPAllowed(clientIP)) {
    return new Response('Access Denied', { status: 403 });
  }
  
  // ... rest of function
}
```

## API Key Protection

### Current Implementation

The heartbeat endpoint already requires API keys:

```javascript
// Validate API key if configured
if (service.apiKey) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${service.apiKey}`) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Best Practices

1. **Generate Strong Keys**:
   ```bash
   # Generate random API key
   openssl rand -hex 32
   ```

2. **Rotate Regularly**:
   - Change API keys every 90 days
   - Update in both `services.json` and client scripts

3. **Store Securely**:
   - Never commit API keys to git
   - Use environment variables or secret managers
   - Consider using Wrangler secrets

## DDoS Protection

### Cloudflare Built-in Protection

Your worker is automatically protected by Cloudflare's DDoS protection:

✅ **Network Layer (L3/L4)**
- Automatic mitigation of volumetric attacks
- Global anycast network
- No configuration needed

✅ **Application Layer (L7)**
- Rate limiting (implemented)
- Challenge pages (can enable)
- Bot management

### Additional DDoS Mitigation

#### 1. Enable Challenge Pages

Add to worker for suspicious requests:

```javascript
// Check if request looks suspicious
if (isRequestSuspicious(request)) {
  return new Response('Please verify you are human', {
    status: 403,
    headers: {
      'CF-Mitigate-Challenge': '1'
    }
  });
}
```

#### 2. Enable Bot Fight Mode

In Cloudflare Dashboard:
1. Go to **Security** → **Bots**
2. Enable **Bot Fight Mode** (free) or **Super Bot Fight Mode** (paid)

#### 3. Security Level

In Cloudflare Dashboard:
1. Go to **Security** → **Settings**
2. Set Security Level to **High**

#### 4. Cache Everything

Reduce origin load by caching:

```javascript
// Add cache headers
return new Response(html, {
  headers: {
    'Content-Type': 'text/html',
    'Cache-Control': 'public, max-age=60'  // Cache for 1 minute
  }
});
```

## Security Headers

Add security headers to all responses:

```javascript
function addSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Optional: Add CSP
  headers.set('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}
```

## Monitoring & Alerts

### Monitor Security Events

1. **Enable logging** in Cloudflare:
   - Go to **Analytics** → **Logs** → **Logpush**
   - Send logs to your SIEM or log aggregator

2. **Alert on suspicious activity**:
   - High rate of 429 responses
   - Multiple 401 (unauthorized) attempts
   - Unusual traffic patterns

3. **Use Cloudflare Analytics**:
   - Monitor request rates
   - Track blocked requests
   - Review security events

## Best Practices

### ✅ DO

1. **Use HTTPS only** - Already enforced by Cloudflare Workers
2. **Rotate API keys** regularly (every 90 days)
3. **Enable rate limiting** (already implemented)
4. **Use Cloudflare Access** for dashboard (if multiple users)
5. **Monitor security logs** regularly
6. **Keep dependencies updated** (Dependabot configured)
7. **Use strong passwords** (32+ characters, random)
8. **Enable MFA** on Cloudflare account
9. **Review access logs** periodically
10. **Test security** with tools like OWASP ZAP

### ❌ DON'T

1. **Never commit secrets** to git
2. **Don't disable rate limiting** without good reason
3. **Don't use weak passwords** (< 20 characters)
4. **Don't share API keys** between services
5. **Don't expose internal URLs** in error messages
6. **Don't disable Cloudflare proxy** (orange cloud)
7. **Don't ignore security updates**
8. **Don't use default credentials**

## Security Checklist

Before going to production:

- [ ] Rate limiting enabled
- [ ] API keys configured for all services
- [ ] Dashboard authentication enabled (if public)
- [ ] Cloudflare Access configured (if team access needed)
- [ ] Security headers added
- [ ] Bot protection enabled
- [ ] Monitoring and alerting set up
- [ ] Secrets stored securely (not in git)
- [ ] API keys rotated and tested
- [ ] Access logs reviewed
- [ ] Security testing completed
- [ ] Incident response plan documented
- [ ] Team members trained on security practices

## Incident Response

If you detect a security incident:

1. **Immediate Actions**:
   - Enable "Under Attack Mode" in Cloudflare
   - Rotate all API keys
   - Review access logs
   - Block suspicious IPs

2. **Investigation**:
   - Check Cloudflare Analytics for patterns
   - Review worker logs: `npx wrangler tail`
   - Identify attack vector
   - Document findings

3. **Remediation**:
   - Apply security patches
   - Update configurations
   - Strengthen affected components
   - Test thoroughly

4. **Post-Incident**:
   - Document lessons learned
   - Update security procedures
   - Train team on new threats
   - Improve monitoring

## Resources

- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Cloudflare WAF](https://developers.cloudflare.com/waf/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Support

For security concerns:
- Review Cloudflare security documentation
- Check worker logs: `npx wrangler tail`
- Contact Cloudflare support for DDoS attacks
- Open a private security issue on GitHub

---

**Stay secure! 🔒**

