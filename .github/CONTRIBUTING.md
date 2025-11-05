# Contributing to Cloudflare Heartbeat Monitor

Thank you for considering contributing to this project! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/cloudflaremon.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes locally
6. Commit your changes: `git commit -m "Add: description of changes"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js v20 or higher
- npm (comes with Node.js)
- Git

### Setup Steps

```bash
# Install dependencies
npm install

# Create KV namespace for testing
npx wrangler kv:namespace create "HEARTBEAT_LOGS"

# Update wrangler.toml with your KV namespace ID

# Start local development server
npm run dev

# Test deployment (dry-run)
npx wrangler deploy --dry-run
```

## Code Guidelines

### JavaScript

- Use modern ES6+ syntax
- Keep functions small and focused
- Add comments for complex logic
- Handle errors gracefully
- Avoid hardcoded values (use configuration)

### Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for design changes
- Add comments to code for clarity
- Include examples where helpful

### Commit Messages

Use conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

Examples:
```
feat: add webhook notifications on service down
fix: correct staleness threshold calculation
docs: update deployment guide with custom domains
```

## Testing

### Local Testing

1. **Test the worker locally:**
   ```bash
   npm run dev
   ```

2. **Test heartbeat endpoint:**
   ```bash
   curl -X POST http://localhost:8787/api/heartbeat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-key" \
     -d '{"serviceId": "test", "status": "up"}'
   ```

3. **Test dashboard:**
   Open `http://localhost:8787` in your browser

### Deployment Testing

1. **Dry-run deployment:**
   ```bash
   npx wrangler deploy --dry-run
   ```

2. **Deploy to test environment:**
   ```bash
   npx wrangler deploy --env staging
   ```

### Heartbeat Client Testing

Test all client scripts:

```bash
# Bash
./examples/heartbeat-client.sh

# Python
python3 examples/heartbeat-client.py

# Node.js
node examples/heartbeat-client.js
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Test your changes** thoroughly
3. **Fill out the PR template** completely
4. **Link any related issues** in the PR description
5. **Wait for review** - maintainers will review within 1-2 days
6. **Address feedback** if changes are requested
7. **Squash commits** if requested before merge

## What to Contribute

### Good First Issues

- Fix typos in documentation
- Improve error messages
- Add more client script examples
- Enhance dashboard styling
- Add input validation

### Feature Ideas

- Alert integrations (Slack, Discord, email)
- Custom status page generation
- Historical uptime charts
- Webhook notifications
- Multi-region support
- Service dependency tracking
- Advanced health check logic

### Bug Reports

When reporting bugs, please include:

- **Description**: What happened vs. what you expected
- **Steps to reproduce**: Detailed steps
- **Environment**: OS, Node.js version, Wrangler version
- **Logs**: Worker logs (`npm run tail`) if applicable
- **Screenshots**: If it's a UI issue

## Code Review

All submissions require review. We use GitHub Pull Requests for this purpose.

**Reviewers will check:**
- Code quality and style
- Test coverage
- Documentation updates
- Security implications
- Performance impact
- Breaking changes

## Security

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email the maintainer directly (see README)
3. Provide detailed information
4. Wait for a response before disclosure

## Questions?

- Open a [Discussion](https://github.com/your-username/cloudflaremon/discussions)
- Check existing [Issues](https://github.com/your-username/cloudflaremon/issues)
- Review the [README](../README.md) and [ARCHITECTURE](../ARCHITECTURE.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏

