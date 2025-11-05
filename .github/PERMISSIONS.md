# GitHub Actions Permissions

## Understanding GITHUB_TOKEN Permissions

GitHub Actions provides an automatic token (`GITHUB_TOKEN`) that workflows can use to interact with your repository. However, for security reasons, you must explicitly declare what permissions each workflow needs.

## The Error You Saw

```
Resource not accessible by integration
x-accepted-github-permissions: issues=write; pull_requests=write
```

This error means:
- The workflow tried to write a comment on a PR
- But the `GITHUB_TOKEN` didn't have explicit permission
- GitHub requires you to declare permissions in the workflow

## How We Fixed It

Added a `permissions` block to the workflow:

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read           # Read repository code
      pull-requests: write     # Comment on PRs
      issues: write           # Comment on issues (PRs are issues)
    steps:
      # ... workflow steps
```

## Common Permission Scopes

### Read Permissions (Safe)
- `contents: read` - Read repository files
- `pull-requests: read` - Read PR information
- `issues: read` - Read issues

### Write Permissions (More Powerful)
- `contents: write` - Push code, create branches
- `pull-requests: write` - Comment on/modify PRs
- `issues: write` - Create/comment on issues
- `packages: write` - Publish packages

### Special Permissions
- `deployments: write` - Create deployments
- `actions: write` - Cancel/re-run workflows
- `checks: write` - Create check runs

## Our Workflows

### `deploy.yml` (Production)
**Default permissions** - No special permissions needed
- Uses Cloudflare API token (from secrets)
- Doesn't interact with GitHub API

### `preview.yml` (PR Validation)
**Explicit permissions required:**
```yaml
permissions:
  contents: read           # Read code to validate
  pull-requests: write     # Comment validation results
  issues: write           # Required for PR comments
```

## Why These Permissions?

### `contents: read`
- **Needed for:** Checking out code with `actions/checkout`
- **Risk level:** Low (read-only)
- **Alternatives:** None, required for most workflows

### `pull-requests: write`
- **Needed for:** Posting comments on PRs
- **Risk level:** Medium (can spam comments)
- **What it allows:**
  - Create/update PR comments
  - Request reviewers
  - Add labels
- **What it CANNOT do:**
  - Merge PRs
  - Push code
  - Close PRs (without `issues: write`)

### `issues: write`
- **Needed for:** GitHub treats PR comments as issue comments
- **Risk level:** Medium
- **What it allows:**
  - Comment on issues/PRs
  - Create issues
  - Add labels
- **What it CANNOT do:**
  - Push code
  - Modify repository settings

## Security Best Practices

### ✅ DO

1. **Use minimal permissions**
   ```yaml
   # Good - only what you need
   permissions:
     contents: read
     pull-requests: write
   ```

2. **Declare permissions explicitly**
   - Makes it clear what the workflow does
   - Prevents accidental permission escalation

3. **Use read-only when possible**
   ```yaml
   # If you don't need to comment
   permissions:
     contents: read
   ```

### ❌ DON'T

1. **Give too many permissions**
   ```yaml
   # Bad - unnecessary permissions
   permissions:
     contents: write
     packages: write
     deployments: write
   ```

2. **Use default permissions blindly**
   - Always declare what you need
   - Don't rely on repository defaults

3. **Mix secrets with high permissions**
   - Keep deployment secrets separate
   - Use dedicated tokens for dangerous operations

## Default vs Explicit Permissions

### Default Behavior (No permissions block)
```yaml
# No permissions declared
jobs:
  test:
    runs-on: ubuntu-latest
    # Uses repository's default permissions
```
- Uses repository-wide GITHUB_TOKEN settings
- Can be permissive or restrictive depending on repo settings
- **Not recommended** - unclear what workflow can do

### Explicit Permissions (Recommended)
```yaml
# Explicit permissions
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read  # Only what we need
```
- Clear and documented
- Overrides repository defaults
- **Recommended** - explicit is better than implicit

## Troubleshooting Permission Errors

### Error: "Resource not accessible by integration"

**Cause:** Missing required permission

**Solution:**
1. Check the error headers for required permissions:
   ```
   x-accepted-github-permissions: issues=write; pull_requests=write
   ```

2. Add to workflow:
   ```yaml
   permissions:
     issues: write
     pull-requests: write
   ```

### Error: "Not enough permissions to create deployment"

**Cause:** Missing `deployments: write`

**Solution:**
```yaml
permissions:
  deployments: write
```

### Error: "Cannot push to repository"

**Cause:** Missing `contents: write`

**Solution:**
```yaml
permissions:
  contents: write
```

## Repository Settings

You can also configure default permissions for all workflows:

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Choose:
   - **Read repository contents and packages permissions** (restrictive, recommended)
   - **Read and write permissions** (permissive)

**Recommendation:** Use restrictive defaults, then explicitly grant permissions per workflow.

## Our Recommendation

For this project:

```yaml
# For validation/testing workflows
permissions:
  contents: read
  pull-requests: write
  issues: write

# For deployment workflows  
# No permissions block needed (uses Cloudflare API token)
```

## Learn More

- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [Permission Scopes Reference](https://docs.github.com/en/rest/overview/permissions-required-for-github-apps)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## Quick Reference

| Permission | Read | Write | When Needed |
|------------|------|-------|-------------|
| `contents` | ✓ | ✓ | Code checkout, pushing |
| `pull-requests` | ✓ | ✓ | Reading/commenting on PRs |
| `issues` | ✓ | ✓ | Creating/commenting issues |
| `packages` | ✓ | ✓ | Publishing packages |
| `deployments` | ✓ | ✓ | Creating deployments |
| `actions` | ✓ | ✓ | Managing workflows |
| `checks` | ✓ | ✓ | Creating check runs |

---

**Remember:** Always use the **minimum permissions required** for your workflow to function.

