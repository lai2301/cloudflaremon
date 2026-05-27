export function renderStyles(uiConfig) {
  return `    <style>
        :root {
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
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] {
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
        
        header {
            margin-bottom: 48px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .logo {
            max-width: 120px;
            max-height: 80px;
            margin-bottom: 16px;
        }
        
        .header-links {
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 32px;
        }
        
        .header-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.2s;
            padding: 8px 16px;
            border-radius: 6px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
        }
        
        .header-links a:hover {
            color: var(--text-primary);
            border-color: var(--text-tertiary);
        }
        
        .header-links a.highlight {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        
        .header-links a.highlight:hover {
            background: linear-gradient(135deg, #5568d3 0%, #653a8a 100%);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            color: white;
        }
        
        h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text-primary);
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 16px;
            margin-bottom: 0;
        }
        
        .overall-status {
            background: var(--bg-primary);
            padding: 32px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .status-indicator.operational {
            background: var(--status-up);
            box-shadow: 0 0 0 4px var(--status-up-bg);
        }
        
        .status-indicator.issues {
            background: var(--status-down);
            box-shadow: 0 0 0 4px var(--status-down-bg);
        }
        
        .status-indicator.degraded {
            background: var(--status-degraded);
            box-shadow: 0 0 0 4px var(--status-degraded-bg);
        }
        
        .status-text {
            flex: 1;
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        
        .status-description {
            font-size: 14px;
            color: var(--text-secondary);
        }
        
        .last-checked {
            font-size: 13px;
            color: var(--text-tertiary);
        }
        
        .services-container {
            background: var(--bg-primary);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            overflow: hidden;
            margin-bottom: 24px;
        }
        
        .services-container:last-child {
            margin-bottom: 0;
        }
        
        .services-header {
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .services-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .threshold-legend {
            display: flex;
            gap: 12px;
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
        
        .service-item {
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.15s ease;
        }
        
        .service-item:last-child {
            border-bottom: none;
        }
        
        .service-item:hover {
            background: var(--bg-hover);
        }
        
        .service-main {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .service-status-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        
        .service-status-icon.up {
            background: var(--status-up);
            color: white;
        }
        
        .service-status-icon.down {
            background: var(--status-down);
            color: white;
        }
        
        .service-status-icon.degraded {
            background: var(--status-degraded);
            color: white;
        }
        
        .service-status-icon.unknown {
            background: var(--status-unknown);
            color: white;
        }
        
        .service-name {
            font-size: 16px;
            font-weight: 500;
            color: var(--text-primary);
            flex: 1;
        }
        
        .service-uptime {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        ${Object.values(uiConfig.uptimeThresholds).flatMap(thresholdSet => 
            thresholdSet.map(threshold => `
        .service-uptime.uptime-${threshold.name} {
            color: ${threshold.color};
            background: ${threshold.color}15;
            border: 1px solid ${threshold.color}40;
        }`)).join('\n')}
        
        .uptime-bar-container {
            margin-bottom: 12px;
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
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
            gap: 24px;
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
            margin: 0 auto 16px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .theme-toggle-container {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 8px;
        }
        
        .theme-toggle, .export-btn, .auto-refresh-btn, .alert-history-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            position: relative;
        }
        
        .theme-toggle:hover, .export-btn:hover, .auto-refresh-btn:hover, .alert-history-btn:hover {
            background: var(--bg-hover);
            transform: scale(1.05);
        }
        
        .auto-refresh-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #163d92;
        }
        
        .auto-refresh-btn.active:hover {
            background:#163d92;
        }
        
        .auto-refresh-timer {
            position: absolute;
            bottom: -2px;
            right: -2px;
            background: #10b981;
            color: white;
            font-size: 9px;
            font-weight: 600;
            padding: 2px 4px;
            border-radius: 4px;
            min-width: 18px;
            text-align: center;
        }
        
        /* Auto-refresh dropdown menu */
        .auto-refresh-menu {
            display: none;
            position: absolute;
            top: 52px;
            right: 0;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px;
            min-width: 180px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideDown 0.2s ease-out;
        }
        
        .auto-refresh-menu.show {
            display: block;
        }
        
        .auto-refresh-menu-item {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
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
            content: '✓';
            margin-left: 8px;
        }
        
        .auto-refresh-menu-divider {
            height: 1px;
            background: var(--border-color);
            margin: 8px 0;
        }
        
        .refresh-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
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
            position: absolute;
            top: 60px;
            right: 20px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
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
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }
        
        .export-dialog-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .export-dialog-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .export-btn.active {
            background: var(--bg-hover);
            border-color: #3b82f6;
        }
        
        .export-form-group {
            margin-bottom: 20px;
        }
        
        .export-form-label {
            display: block;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .export-form-input, .export-form-select {
            width: 100%;
            padding: 10px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
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
            border-radius: 8px;
            padding: 12px;
            background: var(--bg-secondary);
        }
        
        .export-service-item {
            display: flex;
            align-items: center;
            padding: 8px;
            margin-bottom: 4px;
            border-radius: 6px;
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
            gap: 12px;
            margin-top: 24px;
        }
        
        .export-btn-primary, .export-btn-secondary {
            flex: 1;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
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
            gap: 12px;
        }
        
        .export-quick-ranges {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }
        
        .export-quick-btn {
            padding: 6px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
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

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--bg-primary);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            text-align: center;
        }

        .stat-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .stat-value.up { color: var(--status-up); }
        .stat-value.down { color: var(--status-down); }
        .stat-value.degraded { color: var(--status-degraded); }
        .stat-value.unknown { color: var(--status-unknown); }

        .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        footer {
            margin-top: 80px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
            text-align: center;
        }
        
        footer p {
            color: var(--text-tertiary);
            font-size: 14px;
            margin-bottom: 12px;
        }
        
        .footer-links {
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .footer-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }
        
        .footer-links a:hover {
            color: var(--text-primary);
        }
        
        /* Alert Toast Notifications */
        .alert-toast-container {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
        }
        
        .alert-toast {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
            position: relative;
            display: flex;
            gap: 12px;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .alert-toast.closing {
            animation: slideOutRight 0.3s ease-out forwards;
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .alert-toast-icon {
            font-size: 24px;
            flex-shrink: 0;
            line-height: 1;
        }
        
        .alert-toast-content {
            flex: 1;
            min-width: 0;
        }
        
        .alert-toast-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--text-primary);
        }
        
        .alert-toast-message {
            font-size: 13px;
            color: var(--text-secondary);
            word-wrap: break-word;
        }
        
        .alert-toast-time {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-top: 4px;
        }
        
        .alert-toast-close {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .alert-toast-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .alert-toast.severity-critical {
            border-left: 4px solid #ef4444;
        }
        
        .alert-toast.severity-warning {
            border-left: 4px solid #f59e0b;
        }
        
        .alert-toast.severity-info {
            border-left: 4px solid #3b82f6;
        }
        
        /* Alert History Modal */
        .alert-history-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        }
        
        .alert-history-modal.active {
            display: flex;
        }
        
        .alert-history-content {
            background: var(--bg-primary);
            border-radius: 12px;
            max-width: 900px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        .alert-history-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .alert-history-header h2 {
            margin: 0;
            font-size: 20px;
            color: var(--text-primary);
        }
        
        .alert-history-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .alert-history-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .alert-history-filters {
            padding: 16px 24px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 6px 12px;
            border-radius: 6px;
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
        
        .alert-history-body {
            padding: 16px 24px;
            overflow-y: auto;
            flex: 1;
        }
        
        .alert-history-item {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid #6b7280;
            transition: all 0.2s;
        }
        
        .alert-history-item:hover {
            transform: translateX(4px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
            font-weight: 600;
            color: var(--text-primary);
            font-size: 15px;
            flex: 1;
        }
        
        .alert-history-item-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 12px;
        }
        
        .alert-history-item-badge.critical {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .alert-history-item-badge.warning {
            background: #fef3c7;
            color: #92400e;
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
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        
        .alert-history-item-footer {
            display: flex;
            gap: 16px;
            font-size: 12px;
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
            margin-bottom: 12px;
        }
        
        @media (max-width: 768px) {
            .alert-toast-container {
                left: 20px;
                right: 20px;
                max-width: none;
            }
            
            .alert-history-content {
                width: 95%;
                max-height: 90vh;
            }
            
            .alert-history-filters {
                flex-direction: column;
            }
            
            .filter-btn {
                width: 100%;
            }
        }
        
        /* Custom CSS from config */
        ${uiConfig.customCss}

        /* Icon helper classes */
        .icon { width: 1em; height: 1em; vertical-align: -0.125em; display: inline-block; flex-shrink: 0; }
        .icon--lg { width: 1.25em; height: 1.25em; }
        .icon--xl { width: 1.5em; height: 1.5em; }
    </style>`;
}
