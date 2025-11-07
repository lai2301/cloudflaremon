# UI Customization Guide

Customize the dashboard appearance using `ui.json`.

## Table of Contents

- [Overview](#overview)
- [Configuration File](#configuration-file)
- [Header Customization](#header-customization)
- [Branding](#branding)
- [Footer](#footer)
- [Features](#features)
- [Custom CSS](#custom-css)
- [Custom HTML](#custom-html)
- [Examples](#examples)

## Overview

The dashboard UI can be fully customized through the `ui.json` configuration file. This allows you to:
- Add your company logo
- Change page title and header text
- Customize footer content
- Add custom CSS styles
- Inject custom HTML
- Control auto-refresh behavior

## Configuration File

Create or edit `ui.json` in your project root:

```json
{
  "header": { ... },
  "branding": { ... },
  "footer": { ... },
  "features": { ... },
  "customCss": "",
  "customHtml": { ... }
}
```

💡 **Tip:** Copy `ui.example.json` to `ui.json` and customize it.

## Header Customization

### Title and Subtitle

```json
{
  "header": {
    "title": "Acme Corp Status",
    "subtitle": "All systems operational"
  }
}
```

**Result:**
```
╔═══════════════════════╗
║  Acme Corp Status     ║
║  All systems operational ║
╚═══════════════════════╝
```

### Adding a Logo

```json
{
  "header": {
    "title": "Service Monitor",
    "subtitle": "Real-time monitoring",
    "logoUrl": "https://your-cdn.com/logo.png",
    "logoAlt": "Company Logo",
    "showLogo": true
  }
}
```

**Logo Guidelines:**
- **Size:** Max 120x80px (auto-scaled)
- **Format:** PNG, SVG, or JPEG
- **Hosting:** Use a CDN or data URI
- **Dark Mode:** Logo should work in both light and dark themes

**Example with data URI:**
```json
{
  "logoUrl": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'...%3C/svg%3E"
}
```

### Header Navigation Links

Add navigation links at the top of the header (above title):

```json
{
  "header": {
    "title": "Service Monitor",
    "subtitle": "Real-time monitoring",
    "links": [
      {
        "text": "Home",
        "url": "/"
      },
      {
        "text": "Documentation",
        "url": "https://github.com/your-username/cloudflaremon"
      },
      {
        "text": "Support",
        "url": "/support"
      }
    ]
  }
}
```

**Visual Layout:**
```
┌──────────────────────────────┐
│  [Home] [Docs] [Support]     │ ← Navigation Links (top)
│                              │
│    Service Monitor           │ ← Title
│  Real-time monitoring        │ ← Subtitle
└──────────────────────────────┘
```

**Link Behavior:**
- External URLs (starting with `http`) open in new tab
- Internal URLs open in same tab
- Links are styled as buttons with hover effects
- Responsive: wraps on smaller screens

## Branding

### Page Title and Favicon

```json
{
  "branding": {
    "pageTitle": "Status - Acme Corp",
    "favicon": "https://your-cdn.com/favicon.ico"
  }
}
```

- **pageTitle:** Appears in browser tab
- **favicon:** 32x32 icon for browser tab

### Reserved Colors

```json
{
  "branding": {
    "primaryColor": "#3b82f6",
    "accentColor": "#10b981"
  }
}
```

⚠️ **Note:** `primaryColor` and `accentColor` are reserved for future features. Use `customCss` to override colors now.

## Footer

### Basic Footer

```json
{
  "footer": {
    "text": "© 2025 Acme Corp"
  }
}
```

### Footer with Links

```json
{
  "footer": {
    "text": "Powered by Cloudflare Workers",
    "links": [
      {
        "text": "Documentation",
        "url": "https://github.com/your-username/cloudflaremon"
      },
      {
        "text": "Status Page",
        "url": "/"
      },
      {
        "text": "Contact Support",
        "url": "mailto:support@example.com"
      }
    ]
  }
}
```

**Link Behavior:**
- External URLs (starting with `http`) open in new tab
- Internal URLs open in same tab
- Email links (`mailto:`) work as expected

## Features

### Auto-Refresh

```json
{
  "features": {
    "autoRefreshSeconds": 30
  }
}
```

- **Default:** 30 seconds
- **Disable:** Set to `0`
- **Recommended:** 15-60 seconds

### Reserved Feature Flags

```json
{
  "features": {
    "showRefreshButton": true,
    "showLastUpdated": true,
    "showUptimePercentage": true,
    "show90DayHistory": true
  }
}
```

⚠️ **Note:** These flags are reserved for future use. All features are currently always shown.

## Custom CSS

### Basic Styling

```json
{
  "customCss": ".logo { max-width: 200px; border-radius: 50%; }"
}
```

### Advanced Customization

```json
{
  "customCss": "
    /* Custom logo styling */
    .logo {
      max-width: 200px;
      border-radius: 50%;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    /* Custom header colors */
    h1 {
      color: #e11d48;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Custom footer background */
    footer {
      background: var(--bg-primary);
      padding: 24px;
      border-radius: 12px;
    }
  "
}
```

### Available CSS Variables

The dashboard uses CSS variables for theming:

**Colors:**
```css
--bg-primary: #ffffff (dark: #111827)
--bg-secondary: #f9fafb (dark: #1f2937)
--text-primary: #111827 (dark: #f9fafb)
--text-secondary: #6b7280 (dark: #d1d5db)
--border-color: #e5e7eb (dark: #374151)
```

**Status Colors:**
```css
--status-up: #10b981
--status-down: #ef4444
--status-degraded: #f59e0b
--status-unknown: #6b7280
```

**Example using variables:**
```json
{
  "customCss": ".my-custom-element { background: var(--bg-secondary); color: var(--text-primary); }"
}
```

## Custom HTML

### Header Announcements

```json
{
  "customHtml": {
    "headerExtra": "<div style='background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 16px;'>⚠️ Scheduled maintenance on Sunday at 2 AM UTC</div>"
  }
}
```

### Footer Extra Content

```json
{
  "customHtml": {
    "footerExtra": "<p style='margin-top: 16px; font-size: 12px;'>Need help? <a href='/support'>Contact Support</a></p>"
  }
}
```

⚠️ **Security Note:** Be careful with user-generated content in custom HTML. Only use trusted HTML.

## Examples

### Example 1: Corporate Branding

```json
{
  "header": {
    "title": "Acme Corporation",
    "subtitle": "System Status Dashboard",
    "logoUrl": "https://cdn.acme.com/logo.png",
    "logoAlt": "Acme Corporation",
    "showLogo": true,
    "links": [
      {
        "text": "Main Site",
        "url": "https://acme.com"
      },
      {
        "text": "Support",
        "url": "https://support.acme.com"
      },
      {
        "text": "API Docs",
        "url": "https://docs.acme.com"
      }
    ]
  },
  "branding": {
    "pageTitle": "Status - Acme Corporation",
    "favicon": "https://cdn.acme.com/favicon.ico"
  },
  "footer": {
    "text": "© 2025 Acme Corporation. All rights reserved.",
    "links": [
      { "text": "Privacy Policy", "url": "/privacy" },
      { "text": "Terms", "url": "/terms" },
      { "text": "Contact", "url": "mailto:status@acme.com" }
    ]
  },
  "features": {
    "autoRefreshSeconds": 45
  }
}
```

### Example 2: Minimalist Design

```json
{
  "header": {
    "title": "Status",
    "subtitle": "",
    "showLogo": false
  },
  "branding": {
    "pageTitle": "Status"
  },
  "footer": {
    "text": "",
    "links": []
  },
  "customCss": "h1 { font-size: 40px; font-weight: 900; }"
}
```

### Example 3: Maintenance Banner

```json
{
  "header": {
    "title": "Service Monitor",
    "subtitle": "Real-time service health monitoring"
  },
  "customHtml": {
    "headerExtra": "
      <div style='
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 12px;
        margin-top: 16px;
        text-align: center;
        font-weight: 600;
      '>
        🚧 Scheduled Maintenance: Sunday, Nov 10, 2-4 AM UTC
      </div>
    "
  }
}
```

### Example 4: Dark Theme Customization

```json
{
  "customCss": "
    @media (prefers-color-scheme: dark) {
      .logo {
        filter: brightness(0) invert(1);
      }
      
      h1 {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  "
}
```

### Example 5: Multi-Language Support

```json
{
  "header": {
    "title": "状態監視",
    "subtitle": "リアルタイム サービス監視"
  },
  "footer": {
    "text": "Cloudflare Workers によって提供されています",
    "links": [
      { "text": "ドキュメント", "url": "/docs" },
      { "text": "サポート", "url": "/support" }
    ]
  }
}
```

## Best Practices

### 1. Keep It Fast
- Host logo on a CDN
- Use optimized images (SVG preferred)
- Minimize custom CSS

### 2. Test in Both Themes
- Always test light and dark modes
- Use CSS variables for theme consistency
- Consider using `filter` for logo dark mode compatibility

### 3. Responsive Design
- Logo should work at small sizes
- Footer links should wrap on mobile
- Test on different screen sizes

### 4. Accessibility
- Provide meaningful `logoAlt` text
- Ensure sufficient color contrast
- Use semantic HTML in custom content

### 5. Version Control
- Keep `ui.json` in version control
- Document custom CSS purposes
- Test changes before deploying

## Troubleshooting

### Logo Not Showing

1. Check `showLogo: true`
2. Verify `logoUrl` is accessible (test in browser)
3. Check browser console for CORS errors
4. Try a data URI instead of external URL

### Custom CSS Not Applied

1. Check JSON syntax (no trailing commas)
2. Verify CSS selectors match elements
3. Use browser DevTools to inspect
4. Check for CSS specificity issues

### Footer Links Not Working

1. Verify `links` is an array
2. Check URL format (include `https://` for external)
3. Test URLs individually

## Advanced Customization

For more advanced customization beyond what `ui.json` offers, you'll need to modify `src/index.js` directly. Consider:

- Custom JavaScript
- Additional dashboard sections
- Different layout structures
- Interactive widgets

## Related Documentation

- [Main README](../README.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Need more customization?** Open an issue on GitHub with your use case!

