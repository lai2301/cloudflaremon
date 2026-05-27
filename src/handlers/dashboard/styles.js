export function renderStyles(uiConfig) {
  return `    <style>
        :root {
            /* Operator-overridable branding / theme tokens */
            --bg-primary: ${uiConfig.theme.colors.light.primary};
            --bg-secondary: ${uiConfig.theme.colors.light.secondary};
            --bg-hover: #f3f4f6;
            --text-primary: ${uiConfig.theme.colors.light.text};
            --text-secondary: ${uiConfig.theme.colors.light.textSecondary};
            --text-tertiary: #9ca3af;
            --border-color: ${uiConfig.theme.colors.light.border};
            --status-up: ${uiConfig.theme.colors.light.statusUp};
            --status-up-bg: #d1fae5;
            --status-up-text: #065f46;
            --status-down: ${uiConfig.theme.colors.light.statusDown};
            --status-down-bg: #fee2e2;
            --status-down-text: #991b1b;
            --status-degraded: ${uiConfig.theme.colors.light.statusDegraded};
            --status-degraded-bg: #fed7aa;
            --status-degraded-text: #92400e;
            --status-unknown: #6b7280;
            --status-unknown-bg: #e5e7eb;
            --status-unknown-text: #374151;

            /* Typography */
            --font-xs: 12px;
            --font-sm: 14px;
            --font-base: 16px;
            --font-lg: 20px;
            --font-xl: 28px;
            --font-2xl: 40px;
            --font-weight-medium: 500;
            --font-weight-semibold: 600;
            --font-weight-bold: 700;

            /* Spacing */
            --space-1: 4px;
            --space-2: 8px;
            --space-3: 12px;
            --space-4: 16px;
            --space-6: 24px;
            --space-8: 32px;
            --space-12: 48px;

            /* Radius */
            --radius: 10px;
            --radius-sm: 6px;

            /* Shadows */
            --shadow-none: none;
            --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
            --shadow-md: 0 4px 12px rgba(0,0,0,.08);

            /* Status tints */
            --up-fg: #047857;
            --up-bg: #ecfdf5;
            --up-border: #a7f3d0;
            --deg-fg: #b45309;
            --deg-bg: #fffbeb;
            --deg-border: #fde68a;
            --down-fg: #b91c1c;
            --down-bg: #fef2f2;
            --down-border: #fecaca;
            --unk-fg: #4b5563;
            --unk-bg: #f3f4f6;
            --unk-border: #e5e7eb;
        }

        [data-theme="dark"] {
            /* Operator-overridable branding / theme tokens (dark) */
            --bg-primary: ${uiConfig.theme.colors.dark.primary};
            --bg-secondary: ${uiConfig.theme.colors.dark.secondary};
            --bg-hover: #036358;
            --text-primary: ${uiConfig.theme.colors.dark.text};
            --text-secondary: ${uiConfig.theme.colors.dark.textSecondary};
            --text-tertiary: #9ca3af;
            --border-color: ${uiConfig.theme.colors.dark.border};
            --status-up: ${uiConfig.theme.colors.dark.statusUp};
            --status-up-bg: #064e3b;
            --status-up-text: #6ee7b7;
            --status-down: ${uiConfig.theme.colors.dark.statusDown};
            --status-down-bg: #7f1d1d;
            --status-down-text: #fca5a5;
            --status-degraded: ${uiConfig.theme.colors.dark.statusDegraded};
            --status-degraded-bg: #78350f;
            --status-degraded-text: #fcd34d;
            --status-unknown-bg: #374151;
            --status-unknown-text: #d1d5db;

            /* Design token dark overrides */
            --up-bg:     #064e3b;
            --up-border: #065f46;
            --deg-bg:    #78350f;
            --deg-border:#92400e;
            --down-bg:   #7f1d1d;
            --down-border:#991b1b;
            --unk-bg:    #1f2937;
            --unk-border:#374151;
            --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
            --shadow-md: 0 4px 12px rgba(0,0,0,.5);
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg-primary: ${uiConfig.theme.colors.dark.primary};
                --bg-secondary: ${uiConfig.theme.colors.dark.secondary};
                --bg-hover: #036358;
                --text-primary: ${uiConfig.theme.colors.dark.text};
                --text-secondary: ${uiConfig.theme.colors.dark.textSecondary};
                --text-tertiary: #9ca3af;
                --border-color: ${uiConfig.theme.colors.dark.border};
                --status-up: ${uiConfig.theme.colors.dark.statusUp};
                --status-up-bg: #064e3b;
                --status-up-text: #6ee7b7;
                --status-down: ${uiConfig.theme.colors.dark.statusDown};
                --status-down-bg: #7f1d1d;
                --status-down-text: #fca5a5;
                --status-degraded: ${uiConfig.theme.colors.dark.statusDegraded};
                --status-degraded-bg: #78350f;
                --status-degraded-text: #fcd34d;
                --status-unknown-bg: #374151;
                --status-unknown-text: #d1d5db;

                /* Design token dark overrides */
                --up-bg:     #064e3b;
                --up-border: #065f46;
                --deg-bg:    #78350f;
                --deg-border:#92400e;
                --down-bg:   #7f1d1d;
                --down-border:#991b1b;
                --unk-bg:    #1f2937;
                --unk-border:#374151;
                --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
                --shadow-md: 0 4px 12px rgba(0,0,0,.5);
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .page-subtitle {
            color: var(--text-secondary);
            font-size: var(--font-sm);
            margin-bottom: var(--space-4);
        }

        .page-header-extra {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 var(--space-4);
        }
        
        /* Status banner */
        .status-banner {
            border-radius: var(--radius);
            padding: var(--space-6);
            margin: var(--space-6) 0;
            border: 1px solid var(--unk-border);
            background: var(--unk-bg);
            color: var(--unk-fg);
            box-shadow: var(--shadow-none);
        }

        .status-banner--up      { background: var(--up-bg);   border-color: var(--up-border);   color: var(--up-fg); }
        .status-banner--degraded{ background: var(--deg-bg);  border-color: var(--deg-border);  color: var(--deg-fg); }
        .status-banner--down    { background: var(--down-bg); border-color: var(--down-border); color: var(--down-fg); }
        .status-banner--unknown { background: var(--unk-bg);  border-color: var(--unk-border);  color: var(--unk-fg); }

        .status-banner__inner { }

        .status-banner__title {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-semibold);
            margin: 0 0 var(--space-2);
        }

        .status-banner__meta {
            font-size: var(--font-sm);
            opacity: .8;
        }

        /* Summary pill row */
        .summary-row {
            display: flex;
            gap: var(--space-3);
            flex-wrap: wrap;
            margin: var(--space-4) 0 var(--space-6);
        }

        .summary-pill {
            flex: 1 1 0;
            min-width: 140px;
            display: flex;
            align-items: baseline;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-4);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--unk-fg);
            border-radius: var(--radius-sm);
        }

        .summary-pill--up      { border-left-color: var(--up-fg);   }
        .summary-pill--degraded{ border-left-color: var(--deg-fg);  }
        .summary-pill--down    { border-left-color: var(--down-fg); }
        .summary-pill--total   { border-left-color: var(--text-secondary); }

        .summary-pill__count {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
        }

        .summary-pill__label {
            font-size: var(--font-sm);
            color: var(--text-secondary);
        }
        
        .services-container {
            background: var(--bg-primary);
            border-radius: var(--radius);
            border: 1px solid var(--border-color);
            overflow: hidden;
            margin-bottom: var(--space-6);
        }
        
        .services-container:last-child {
            margin-bottom: 0;
        }
        
        .services-header {
            padding: var(--space-6) var(--space-8);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--space-4);
        }

        .services-title {
            font-size: var(--font-lg);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }
        
        .threshold-legend {
            display: flex;
            gap: var(--space-3);
            flex-wrap: wrap;
            font-size: 13px;
        }

        .threshold-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .threshold-badge {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px solid;
        }
        
        /* Service card — status-page two-row layout */
        .service-card {
            padding: var(--space-3) 0;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.15s ease;
        }

        .service-card:last-child {
            border-bottom: 0;
        }

        .service-card:hover {
            background: var(--bg-hover);
        }

        .service-card__row {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: 0 var(--space-4);
        }

        .service-card__identity {
            flex: 1 1 auto;
            min-width: 0;
        }

        .service-card__name {
            font-size: var(--font-base);
            font-weight: var(--font-weight-medium);
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .service-card__meta {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            margin-top: 2px;
        }

        .service-card__pct {
            font-size: var(--font-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-sm);
            transition: all 0.2s;
        }

        .service-card__bar {
            margin-top: var(--space-2);
            padding: 0 var(--space-4);
        }

        /* Status dot */
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
            background: currentColor;
        }

        .status-dot--up       { color: var(--up-fg); }
        .status-dot--degraded { color: var(--deg-fg); }
        .status-dot--down     { color: var(--down-fg); }
        .status-dot--unknown  { color: var(--unk-fg); }
        
        ${Object.values(uiConfig.uptimeThresholds).flatMap(thresholdSet =>
            thresholdSet.map(threshold => `
        .service-uptime.uptime-${threshold.name},
        .service-card__pct.uptime-${threshold.name} {
            color: ${threshold.color};
            background: ${threshold.color}15;
            border: 1px solid ${threshold.color}40;
        }`)).join('\n')}
        
        .uptime-bar-container {
            margin-bottom: var(--space-3);
        }
        
        .uptime-bar-wrapper {
            overflow-x: auto;
            overflow-y: hidden;
            margin-bottom: 8px;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: var(--border-color) var(--bg-secondary);
            scroll-behavior: smooth;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar {
            height: 6px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-track {
            background: var(--bg-secondary);
            border-radius: 3px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-thumb:hover {
            background: var(--text-tertiary);
        }
        
        .uptime-bar {
            display: flex;
            gap: 2px;
            height: 40px;
            min-width: 720px;
        }
        
        @media (max-width: 768px) {
            .uptime-bar {
                min-width: 600px;
            }
        }
        
        .uptime-day {
            flex: 1;
            min-width: 6px;
            background: var(--status-up);
            border-radius: 2px;
            transition: all 0.2s ease;
            position: relative;
            cursor: help;
        }
        
        .uptime-day.up {
            background: var(--status-up);
            opacity: 1;
        }
        
        .uptime-day.down {
            background: var(--status-down);
            opacity: 1;
        }
        
        .uptime-day.degraded {
            background: var(--status-degraded);
            opacity: 1;
        }
        
        .uptime-day.unknown {
            background: var(--border-color);
            opacity: 0.5;
        }
        
        .uptime-day:hover {
            opacity: 0.9;
            transform: scaleY(1.15);
            z-index: 10;
        }
        
        /* Custom tooltip */
        .custom-tooltip {
            position: fixed;
            background: var(--text-primary);
            color: var(--bg-primary);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            font-size: var(--font-xs);
            line-height: 1.4;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            box-shadow: var(--shadow-md);
            opacity: 0;
            transition: opacity 0.1s ease;
        }
        
        .custom-tooltip.show {
            opacity: 1;
        }
        
        .uptime-labels {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-tertiary);
        }
        
        .service-meta {
            display: flex;
            gap: var(--space-6);
            font-size: 13px;
            color: var(--text-secondary);
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .meta-label {
            color: var(--text-tertiary);
        }
        
        .loading {
            text-align: center;
            padding: 64px 20px;
            color: var(--text-secondary);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--text-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--space-4);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* App Bar */
        .appbar {
            position: sticky;
            top: 0;
            z-index: 50;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            backdrop-filter: saturate(180%) blur(8px);
        }

        .appbar__inner {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 var(--space-4);
            height: 56px;
        }

        .appbar__brand {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            color: var(--text-primary);
            text-decoration: none;
            font-weight: var(--font-weight-semibold);
            flex-shrink: 0;
        }

        .appbar__logo { height: 24px; width: auto; }

        .appbar__title { font-size: var(--font-base); }

        .appbar__nav {
            display: flex;
            gap: var(--space-3);
            margin-left: var(--space-4);
        }

        .appbar__link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: var(--font-sm);
        }

        .appbar__link:hover { color: var(--text-primary); }

        .appbar__link--highlight {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: var(--space-1) var(--space-3);
            border-radius: var(--radius-sm);
        }

        .appbar__link--highlight:hover { color: white; opacity: .9; }

        .appbar__actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .appbar__action {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            height: 36px;
            padding: 0 var(--space-3);
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            cursor: pointer;
            font-size: var(--font-sm);
            position: relative;
            transition: background 0.15s, border-color 0.15s;
        }

        .appbar__action:hover {
            background: var(--bg-hover);
            border-color: var(--border-color);
        }

        .appbar__action.active {
            background: #3b82f620;
            border-color: #3b82f6;
            color: #3b82f6;
        }

        .appbar__action--icon {
            padding: 0;
            width: 36px;
            justify-content: center;
        }

        /* Auto-refresh wrapper: anchors the dropdown */
        .appbar__refresh-wrap {
            position: relative;
        }

        .auto-refresh-timer {
            font-size: var(--font-xs);
            font-variant-numeric: tabular-nums;
            color: var(--up-fg);
            font-weight: var(--font-weight-semibold);
        }

        /* Auto-refresh dropdown menu */
        .auto-refresh-menu {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--space-2);
            padding: var(--space-2);
            min-width: 180px;
            box-shadow: var(--shadow-md);
            z-index: 200;
            animation: slideDown 0.2s ease-out;
        }
        
        .auto-refresh-menu.show {
            display: block;
        }
        
        .auto-refresh-menu-item {
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: var(--font-sm);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background 0.2s;
        }
        
        .auto-refresh-menu-item:hover {
            background: var(--bg-hover);
        }
        
        .auto-refresh-menu-item.active {
            background: #3b82f620;
            color: #3b82f6;
            font-weight: 500;
        }
        
        .auto-refresh-menu-item.active::after {
            content: '\\2713 ';
            margin-left: 8px;
        }
        
        .auto-refresh-menu-divider {
            height: 1px;
            background: var(--border-color);
            margin: var(--space-2) 0;
        }

        .refresh-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: var(--space-2) var(--space-4);
            border-radius: var(--space-2);
            cursor: pointer;
            font-size: var(--font-sm);
            font-weight: var(--font-weight-medium);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        
        .refresh-btn:hover {
            background: var(--bg-hover);
        }
        
        .refresh-btn:active {
            transform: scale(0.95);
        }
        
        /* Export Dialog Styles */
        .export-dialog {
            display: none;
            position: fixed;
            top: 64px;
            right: 20px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            padding: var(--space-6);
            width: 450px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .export-dialog.active {
            display: block;
        }
        
        /* Backdrop for mobile */
        .export-backdrop {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9999;
        }
        
        .export-backdrop.active {
            display: block;
        }
        
        .export-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .export-dialog-title {
            font-size: 18px;
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin: 0;
        }

        .export-dialog-close {
            background: none;
            border: none;
            font-size: var(--font-lg);
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            transition: all 0.2s;
        }
        
        .export-dialog-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        #exportBtn.active {
            background: var(--bg-hover);
            border-color: #3b82f6;
        }
        
        .export-form-group {
            margin-bottom: 20px;
        }

        .export-form-label {
            display: block;
            font-weight: var(--font-weight-medium);
            color: var(--text-primary);
            margin-bottom: var(--space-2);
        }

        .export-form-input, .export-form-select {
            width: 100%;
            padding: 10px var(--space-3);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--space-2);
            color: var(--text-primary);
            font-size: var(--font-sm);
            box-sizing: border-box;
        }
        
        .export-form-input:focus, .export-form-select:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        .export-services-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: var(--space-2);
            padding: var(--space-3);
            background: var(--bg-secondary);
        }

        .export-service-item {
            display: flex;
            align-items: center;
            padding: var(--space-2);
            margin-bottom: 4px;
            border-radius: var(--radius-sm);
            transition: background 0.2s;
        }
        
        .export-service-item:hover {
            background: var(--bg-hover);
        }
        
        .export-service-checkbox {
            margin-right: 10px;
            cursor: pointer;
        }
        
        .export-service-label {
            color: var(--text-primary);
            cursor: pointer;
            flex: 1;
        }
        
        .export-actions {
            display: flex;
            gap: var(--space-3);
            margin-top: var(--space-6);
        }

        .export-btn-primary, .export-btn-secondary {
            flex: 1;
            padding: 10px 20px;
            border-radius: var(--space-2);
            cursor: pointer;
            font-weight: var(--font-weight-medium);
            transition: all 0.2s;
            border: none;
        }
        
        .export-btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .export-btn-primary:hover {
            background: #2563eb;
        }
        
        .export-btn-primary:disabled {
            background: #6b7280;
            cursor: not-allowed;
            opacity: 0.5;
        }
        
        .export-btn-secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        
        .export-btn-secondary:hover {
            background: var(--bg-hover);
        }
        
        .export-date-range {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-3);
        }

        .export-quick-ranges {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            margin-top: var(--space-2);
        }

        .export-quick-btn {
            padding: 6px var(--space-3);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 13px;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        
        .export-quick-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: #3b82f6;
        }
        
        @media (max-width: 768px) {
            .export-dialog {
                top: 50%;
                left: 50%;
                right: auto;
                transform: translate(-50%, -50%);
                width: calc(100vw - 40px);
                max-height: calc(100vh - 60px);
            }
            
            .export-dialog.active {
                transform: translate(-50%, -50%);
            }
        }
        
        footer {
            text-align: center;
            padding: 40px 20px 20px;
            color: var(--text-tertiary);
            font-size: 13px;
        }

        footer {
            margin-top: 80px;
            padding-top: var(--space-8);
            border-top: 1px solid var(--border-color);
            text-align: center;
        }

        footer p {
            color: var(--text-tertiary);
            font-size: var(--font-sm);
            margin-bottom: var(--space-3);
        }

        .footer-links {
            display: flex;
            gap: var(--space-6);
            justify-content: center;
            flex-wrap: wrap;
        }

        .footer-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: var(--font-sm);
            transition: color 0.2s;
        }
        
        .footer-links a:hover {
            color: var(--text-primary);
        }
        
        /* Alert Toast Notifications */
        #alertToastContainer {
            position: fixed; bottom: var(--space-4); right: var(--space-4);
            z-index: 1000;
            display: flex; flex-direction: column; gap: var(--space-2);
            max-width: 360px; width: calc(100% - var(--space-8));
        }
        .alert-toast {
            position: relative;
            display: grid;
            grid-template-columns: 4px 24px 1fr 20px;
            align-items: start; gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            animation: alert-toast-in 200ms ease-out;
        }
        .alert-toast__bar { align-self: stretch; border-radius: 2px; background: var(--unk-fg); }
        .alert-toast--critical .alert-toast__bar { background: var(--down-fg); }
        .alert-toast--warning  .alert-toast__bar { background: var(--deg-fg); }
        .alert-toast--info     .alert-toast__bar { background: var(--up-fg); }
        .alert-toast--service  .alert-toast__bar { background: var(--unk-fg); }
        .alert-toast__icon { color: var(--text-secondary); }
        .alert-toast--critical .alert-toast__icon { color: var(--down-fg); }
        .alert-toast--warning  .alert-toast__icon { color: var(--deg-fg); }
        .alert-toast--info     .alert-toast__icon { color: var(--up-fg); }
        .alert-toast__title { font-size: var(--font-base); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
        .alert-toast__message { font-size: var(--font-sm); color: var(--text-secondary); line-height: 1.4; }
        .alert-toast__close {
            background: transparent; border: 0; cursor: pointer;
            color: var(--text-secondary); padding: 0;
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 24px; border-radius: 4px;
        }
        .alert-toast__close:hover { background: var(--bg-hover); color: var(--text-primary); }
        @keyframes alert-toast-in {
            from { transform: translateX(120%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
            .alert-toast { animation: none; }
        }
        
        /* Alert History Drawer */
        .drawer-backdrop {
            position: fixed; inset: 0;
            background: rgba(0,0,0,.4);
            z-index: 900;
            opacity: 0; transition: opacity 200ms ease;
        }
        .drawer-backdrop.is-open { opacity: 1; }
        .drawer-backdrop[hidden] { display: none; }
        .drawer {
            position: fixed; z-index: 1000;
            background: var(--bg-primary);
            display: flex; flex-direction: column;
            box-shadow: var(--shadow-md);
            transition: transform 250ms ease;
        }
        .drawer[hidden] { display: none; }
        .drawer--right {
            top: 0; right: 0; bottom: 0;
            width: 420px; max-width: 90vw;
            transform: translateX(100%);
            border-left: 1px solid var(--border-color);
        }
        .drawer--right.is-open { transform: translateX(0); }
        .drawer__header {
            display: flex; align-items: center; justify-content: space-between;
            padding: var(--space-4) var(--space-6);
            border-bottom: 1px solid var(--border-color);
        }
        .drawer__title {
            display: inline-flex; align-items: center; gap: var(--space-2);
            margin: 0; font-size: var(--font-lg); font-weight: var(--font-weight-semibold);
        }
        .drawer__close {
            background: transparent; border: 0; cursor: pointer;
            color: var(--text-secondary);
            width: 36px; height: 36px; border-radius: var(--radius-sm);
            display: inline-flex; align-items: center; justify-content: center;
        }
        .drawer__close:hover { background: var(--bg-hover); color: var(--text-primary); }
        .drawer__filters {
            display: flex; flex-wrap: wrap; gap: var(--space-2);
            padding: var(--space-3) var(--space-6);
            border-bottom: 1px solid var(--border-color);
        }
        .drawer__list {
            flex: 1; overflow-y: auto;
            padding: var(--space-3) var(--space-6);
        }
        @media (max-width: 640px) {
            .drawer--right {
                left: 0; right: 0; top: auto;
                width: 100%; max-width: 100%; height: 90vh;
                border-left: 0; border-top: 1px solid var(--border-color);
                border-top-left-radius: var(--radius); border-top-right-radius: var(--radius);
                transform: translateY(100%);
            }
            .drawer--right.is-open { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
            .drawer, .drawer-backdrop { transition: none; }
        }

        .filter-btn {
            padding: 6px var(--space-3);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }

        .filter-btn:hover {
            background: var(--bg-hover);
        }

        .filter-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }

        .alert-history-item {
            background: var(--bg-secondary);
            border-radius: var(--space-2);
            padding: var(--space-4);
            margin-bottom: var(--space-3);
            border-left: 4px solid #6b7280;
            transition: all 0.2s;
        }

        .alert-history-item:hover {
            transform: translateX(4px);
            box-shadow: var(--shadow-sm);
        }
        
        .alert-history-item.severity-critical {
            border-left-color: #ef4444;
        }
        
        .alert-history-item.severity-warning {
            border-left-color: #f59e0b;
        }
        
        .alert-history-item.severity-info {
            border-left-color: #3b82f6;
        }
        
        .alert-history-item-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .alert-history-item-title {
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            font-size: 15px;
            flex: 1;
        }

        .alert-history-item-badge {
            padding: 2px var(--space-2);
            border-radius: 4px;
            font-size: 11px;
            font-weight: var(--font-weight-semibold);
            text-transform: uppercase;
            margin-left: var(--space-3);
        }
        
        .alert-history-item-badge.critical {
            background: var(--down-bg);
            color: var(--down-fg);
        }

        .alert-history-item-badge.warning {
            background: var(--deg-bg);
            color: var(--deg-fg);
        }

        .alert-history-item-badge.info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        [data-theme="dark"] .alert-history-item-badge.critical {
            background: #7f1d1d;
            color: #fecaca;
        }
        
        [data-theme="dark"] .alert-history-item-badge.warning {
            background: #78350f;
            color: #fde68a;
        }
        
        [data-theme="dark"] .alert-history-item-badge.info {
            background: #1e3a8a;
            color: #bfdbfe;
        }
        
        .alert-history-item-message {
            color: var(--text-secondary);
            font-size: var(--font-sm);
            line-height: 1.5;
            margin-bottom: var(--space-2);
        }

        .alert-history-item-footer {
            display: flex;
            gap: var(--space-4);
            font-size: var(--font-xs);
            color: var(--text-secondary);
        }
        
        .alert-history-item-source {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .alert-history-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }

        .alert-history-empty-icon {
            font-size: 48px;
            margin-bottom: var(--space-3);
        }
        
        /* Skeleton loading states */
        @keyframes skeleton-pulse {
          0%, 100% { opacity: .7; }
          50%      { opacity: .35; }
        }
        .skeleton {
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          animation: skeleton-pulse 1.4s ease-in-out infinite;
        }
        .skeleton--text   { height: 14px; border-radius: 4px; }
        .skeleton--title  { height: 28px; border-radius: 6px; width: 60%; }
        .skeleton--bar    { height: 22px; width: 100%; }
        .skeleton-card    { padding: var(--space-4); border: 1px solid var(--border-color); border-radius: var(--radius); margin-bottom: var(--space-4); }
        .skeleton-row     { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 0; }
        .skeleton-row + .skeleton-row { border-top: 1px solid var(--border-color); }
        .skeleton-row__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .skeleton-row__id  { flex: 1; height: 14px; max-width: 200px; border-radius: 4px; }
        .skeleton-row__pct { width: 60px; height: 14px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .skeleton { animation: none; }
        }

        /* Custom CSS from config */
        ${uiConfig.customCss}

        /* Icon helper classes */
        .icon { width: 1em; height: 1em; vertical-align: -0.125em; display: inline-block; flex-shrink: 0; }
        .icon--lg { width: 1.25em; height: 1.25em; }
        .icon--xl { width: 1.5em; height: 1.5em; }
    </style>`;
}
