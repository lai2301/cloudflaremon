# UI Customization Guide

Customize the dashboard appearance using configuration files.

## Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
- [Header Customization](#header-customization)
- [Branding](#branding)
- [Theme & Colors](#theme--colors)
- [Uptime Thresholds](#uptime-thresholds)
- [Footer](#footer)
- [Features](#features)
- [Custom CSS](#custom-css)
- [Custom HTML](#custom-html)
- [Examples](#examples)

## Overview

The dashboard UI can be fully customized through configuration files. This allows you to:
- Add your company logo
- Change page title and header text
- Customize footer content
- Configure feature toggles
- Add custom CSS styles
- Inject custom HTML
- Control auto-refresh behavior
- Set uptime thresholds and retention

## Configuration Files

### **New Structure** ✨ (Recommended)

Configuration is split into two files for better organization:

**`config/dashboard.json`** - UI appearance and branding:
```json
{
  "header": { ... },
  "branding": { ... },
  "footer": { ... },
  "customCss": "",
  "customHtml": { ... }
}
```

**`config/settings.json`** - Features and behavior:
```json
{
  "features": { ... },
  "uptimeThresholds": { ... },
  "uptime": { "retentionDays": 120 }
}
```

💡 **Tip:** Copy example files to `config/`:
```bash
cp examples/dashboard.example.json config/dashboard.json
cp examples/settings.example.json config/settings.json
```

### **Legacy Structure** ⚠️ (Still Supported)

**`config/ui.json`** - All-in-one configuration:
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

The system automatically uses `ui.json` if `dashboard.json` is not found, providing backward compatibility.

---

> **📝 Note:** Throughout this guide, examples show configurations that apply to both structures. If using the new split structure, put UI-related settings in `dashboard.json` and feature/behavior settings in `settings.json`.

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
        "text": "Contact Us",
        "url": "/support",
        "highlight": true
      }
    ]
  }
}
```

**Visual Layout:**
```
┌──────────────────────────────┐
│  [Home] [Docs] [Contact Us]  │ ← Navigation Links (top)
│                              │   (Contact Us highlighted)
│    Service Monitor           │ ← Title
│  Real-time monitoring        │ ← Subtitle
└──────────────────────────────┘
```

**Link Properties:**
- `text` (required) - Display text for the link
- `url` (required) - Destination URL
- `highlight` (optional) - Set to `true` to highlight the link with gradient background

**Link Behavior:**
- External URLs (starting with `http`) open in new tab
- Internal URLs open in same tab
- Highlighted links have a purple gradient background and stand out visually
- Links are styled as buttons with hover effects
- Responsive: wraps on smaller screens

## Theme & Colors

### Theme Toggle

Add a toggle button to switch between light and dark mode:

```json
{
  "theme": {
    "defaultMode": "auto",
    "showToggle": true
  }
}
```

**Default Mode Options:**
- `"auto"` - Follows system preference (default)
- `"light"` - Always starts in light mode
- `"dark"` - Always starts in dark mode

**Features:**
- 🌙 Moon icon for light mode, ☀️ sun icon for dark mode
- Button appears in top-right corner
- User preference saved in localStorage
- Respects system theme changes when set to "auto"
- Smooth transitions between themes

### Custom Colors

Customize colors for both light and dark modes:

```json
{
  "theme": {
    "colors": {
      "light": {
        "primary": "#ffffff",
        "secondary": "#f9fafb",
        "text": "#111827",
        "textSecondary": "#6b7280",
        "border": "#e5e7eb",
        "statusUp": "#10b981",
        "statusDown": "#ef4444",
        "statusDegraded": "#f59e0b"
      },
      "dark": {
        "primary": "#111827",
        "secondary": "#1f2937",
        "text": "#f9fafb",
        "textSecondary": "#d1d5db",
        "border": "#374151",
        "statusUp": "#10b981",
        "statusDown": "#ef4444",
        "statusDegraded": "#f59e0b"
      }
    }
  }
}
```

**Color Properties:**
- `primary` - Main background color
- `secondary` - Secondary background (cards, sections)
- `text` - Primary text color
- `textSecondary` - Secondary text color (labels, metadata)
- `border` - Border color for cards and dividers
- `statusUp` - Color for healthy/up services
- `statusDown` - Color for down/error services
- `statusDegraded` - Color for degraded/warning services

**Example: Blue Theme**
```json
{
  "theme": {
    "colors": {
      "light": {
        "primary": "#f0f9ff",
        "secondary": "#e0f2fe",
        "text": "#075985",
        "textSecondary": "#0284c7",
        "border": "#bae6fd",
        "statusUp": "#10b981",
        "statusDown": "#ef4444",
        "statusDegraded": "#f59e0b"
      }
    }
  }
}
```

**Example: High Contrast Dark**
```json
{
  "theme": {
    "defaultMode": "dark",
    "colors": {
      "dark": {
        "primary": "#000000",
        "secondary": "#1a1a1a",
        "text": "#ffffff",
        "textSecondary": "#cccccc",
        "border": "#333333",
        "statusUp": "#00ff00",
        "statusDown": "#ff0000",
        "statusDegraded": "#ffaa00"
      }
    }
  }
}
```

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

## Uptime Thresholds

Customize how uptime percentages are displayed with color-coded thresholds. You can define any number of threshold levels with custom names, percentages, and colors.

### Basic Configuration

```json
{
  "uptimeThresholds": [
    {
      "name": "excellent",
      "min": 99.5,
      "color": "#10b981",
      "label": "Excellent"
    },
    {
      "name": "good",
      "min": 99.0,
      "color": "#3b82f6",
      "label": "Good"
    },
    {
      "name": "fair",
      "min": 95.0,
      "color": "#f59e0b",
      "label": "Fair"
    },
    {
      "name": "poor",
      "min": 0,
      "color": "#ef4444",
      "label": "Poor"
    }
  ]
}
```

### Threshold Properties

Each threshold object has:
- **name**: CSS class identifier (lowercase, no spaces) - will be `uptime-{name}`
- **min**: Minimum uptime percentage for this level
- **color**: Hex color code for the badge
- **label**: Human-readable label (reserved for future use)

### How It Works

1. System evaluates thresholds from highest `min` value to lowest
2. The first threshold where `uptime >= min` is selected
3. The corresponding CSS class and color are applied
4. Always include a threshold with `min: 0` as the catch-all

### Visual Appearance

The thresholds apply visual styling to:
- Background color with transparency
- Text color
- Border with semi-transparent accent

**Example output:**
```
✓ API Service         [99.8%]  ← Green "excellent" badge
✓ Web Server         [99.2%]  ← Blue "good" badge
⚠ Database           [96.5%]  ← Orange "fair" badge
✕ Cache Server       [92.1%]  ← Red "poor" badge
```

### Example: 5 Levels (Granular Tracking)

For more detailed uptime tracking:

```json
{
  "uptimeThresholds": [
    { "name": "perfect", "min": 99.9, "color": "#059669", "label": "Perfect" },
    { "name": "excellent", "min": 99.5, "color": "#10b981", "label": "Excellent" },
    { "name": "good", "min": 99.0, "color": "#3b82f6", "label": "Good" },
    { "name": "fair", "min": 95.0, "color": "#f59e0b", "label": "Fair" },
    { "name": "poor", "min": 0, "color": "#ef4444", "label": "Poor" }
  ]
}
```

### Example: 3 Levels (Simplified)

For a simpler status system:

```json
{
  "uptimeThresholds": [
    { "name": "healthy", "min": 99.0, "color": "#10b981", "label": "Healthy" },
    { "name": "degraded", "min": 95.0, "color": "#f59e0b", "label": "Degraded" },
    { "name": "critical", "min": 0, "color": "#ef4444", "label": "Critical" }
  ]
}
```

### Example: Strict Thresholds

For mission-critical systems requiring four-nines uptime:

```json
{
  "uptimeThresholds": [
    { "name": "excellent", "min": 99.99, "color": "#10b981", "label": "Excellent" },
    { "name": "acceptable", "min": 99.95, "color": "#3b82f6", "label": "Acceptable" },
    { "name": "needs-attention", "min": 99.90, "color": "#f59e0b", "label": "Needs Attention" },
    { "name": "critical", "min": 0, "color": "#ef4444", "label": "Critical" }
  ]
}
```

### Example: Custom Brand Colors

Match your company's brand colors:

```json
{
  "uptimeThresholds": [
    { "name": "excellent", "min": 99.5, "color": "#8b5cf6", "label": "Excellent" },
    { "name": "good", "min": 99.0, "color": "#06b6d4", "label": "Good" },
    { "name": "fair", "min": 95.0, "color": "#f97316", "label": "Fair" },
    { "name": "poor", "min": 0, "color": "#dc2626", "label": "Poor" }
  ]
}
```

### Color Recommendations

Choose colors that provide good contrast and accessibility:

- **Greens**: #10b981, #059669, #22c55e, #16a34a (healthy, excellent)
- **Blues**: #3b82f6, #2563eb, #0891b2, #06b6d4 (good, acceptable)
- **Oranges**: #f59e0b, #d97706, #f97316, #ea580c (fair, warning)
- **Reds**: #ef4444, #dc2626, #f87171, #b91c1c (poor, critical)
- **Purples**: #8b5cf6, #7c3aed, #a855f7 (custom branding)

### Best Practices

1. **Always include a catch-all**: Add a threshold with `min: 0` as the lowest level
2. **Use meaningful names**: Choose names that clearly indicate the status level
3. **Logical ordering**: Define thresholds from highest to lowest (though the system sorts them automatically)
4. **Consistent spacing**: Use consistent percentage gaps between levels (e.g., 0.5% or 1.0%)
5. **Test visibility**: Ensure colors are distinguishable in both light and dark modes

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

### CSV Export

The export button allows users to download uptime data as CSV files with customizable date ranges and service selection.

```json
{
  "features": {
    "showExportButton": true
  }
}
```

**Features:**
- **Custom Date Range:** Select any date range within the retention period
- **Quick Presets:** Last 7, 30, 90 days, or all time
- **Service Selection:** Choose specific services or export all
- **Group Information:** CSV includes service group names
- **Detailed Metrics:** Exports uptime percentage, total checks, up/degraded/down/unknown counts per day

**CSV Columns:**
- Date
- Service Name
- Service ID
- Group
- Status (Up, Down, Degraded, Unknown)
- Uptime % (calculated as (up + degraded) / total × 100)
- Total Checks
- Up Checks
- Degraded Checks
- Down Checks
- Unknown Checks

**Location:** The export button (📊) appears in the top-right corner of the dashboard, next to the theme toggle button.

**Usage:**
1. Click the export button (📊) to toggle the export dialog
2. Select date range using quick presets or custom dates
3. Choose which services to export (all selected by default)
4. Click "Export CSV" to download the file
5. Click the button again, press Escape, or click outside to close the dialog

**UI Behavior:**
- The dialog appears as a dropdown panel positioned near the export button
- On desktop: Dropdown appears in top-right corner with smooth slide-down animation
- On mobile: Dialog centers on screen with backdrop
- Button highlights when dialog is open
- Closes automatically after successful export

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

