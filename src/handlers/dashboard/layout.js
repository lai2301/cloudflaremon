import { ICON_SYMBOLS } from './icons.js';

export function renderLayout({ uiConfig, processedServices, monitorData }) {
  return `${ICON_SYMBOLS}
    <!-- Alert Toast Container -->
    <div class="alert-toast-container" id="alertToastContainer"></div>

    <!-- Alert History Modal -->
    <div class="alert-history-modal" id="alertHistoryModal">
        <div class="alert-history-content">
            <div class="alert-history-header">
                <h2>📋 Alert History</h2>
                <button class="alert-history-close" onclick="closeAlertHistory()" aria-label="Close">×</button>
            </div>
            <div class="alert-history-filters">
                <button class="filter-btn active" data-filter="all" onclick="filterAlerts('all')">All</button>
                <button class="filter-btn" data-filter="critical" onclick="filterAlerts('critical')">🚨 Critical</button>
                <button class="filter-btn" data-filter="warning" onclick="filterAlerts('warning')">⚠️ Warning</button>
                <button class="filter-btn" data-filter="info" onclick="filterAlerts('info')">ℹ️ Info</button>
                <button class="filter-btn" data-filter="heartbeat-monitor" onclick="filterAlerts('heartbeat-monitor')">💓 Service Status</button>
                <button class="filter-btn" data-filter="external" onclick="filterAlerts('external')">📡 External</button>
            </div>
            <div class="alert-history-body" id="alertHistoryBody">
                <div class="alert-history-empty">
                    <div class="alert-history-empty-icon">📭</div>
                    <div>Loading alerts...</div>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        ${uiConfig.theme.showToggle || uiConfig.features.showExportButton !== false || uiConfig.features.showAlertHistoryButton !== false ? `
        <div class="theme-toggle-container">
            ${uiConfig.features.showExportButton !== false && uiConfig.api?.enableUptimeEndpoint !== false ? `
            <button class="export-btn" id="exportBtn" aria-label="Export data" title="Export CSV">
                <span>📊</span>
            </button>
            ` : ''}
            ${uiConfig.features.showAlertHistoryButton !== false && uiConfig.api?.enableAlertHistoryEndpoint !== false ? `
            <button class="alert-history-btn" id="alertHistoryBtn" aria-label="Alert history" title="Alert History">
                <span>🔔</span>
            </button>
            ` : ''}
            ${uiConfig.features.showRefreshButton !== false && (uiConfig.api?.enableStatusEndpoint !== false || uiConfig.api?.enableUptimeEndpoint !== false) ? `
            <button class="auto-refresh-btn" id="autoRefreshBtn" aria-label="Toggle auto-refresh" title="Auto-refresh">
                <span id="autoRefreshIcon">🔄</span>
                <span class="auto-refresh-timer" id="autoRefreshTimer" style="display: none;"></span>
            </button>
            ` : ''}
            <div class="auto-refresh-menu" id="autoRefreshMenu">
                <div class="auto-refresh-menu-item" data-seconds="0">
                    <span>Off</span>
                </div>
                <div class="auto-refresh-menu-divider"></div>
                <div class="auto-refresh-menu-item" data-seconds="10">
                    <span>10 seconds</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="30">
                    <span>30 seconds</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="60">
                    <span>1 minute</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="300">
                    <span>5 minutes</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="600">
                    <span>10 minutes</span>
                </div>
            </div>
            ${uiConfig.theme.showToggle ? `
            <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
                <span id="themeIcon">🌙</span>
            </button>
            ` : ''}
        </div>
        ` : ''}
        <header>
            ${uiConfig.header.showLogo && uiConfig.header.logoUrl ? `<img src="${uiConfig.header.logoUrl}" alt="${uiConfig.header.logoAlt}" class="logo" />` : ''}
            ${uiConfig.header.links && uiConfig.header.links.length > 0 ? `
            <div class="header-links">
                ${uiConfig.header.links.map(link => `<a href="${link.url}" class="${link.highlight ? 'highlight' : ''}" target="${link.url.startsWith('http') ? '_blank' : '_self'}" rel="${link.url.startsWith('http') ? 'noopener noreferrer' : ''}">${link.text}</a>`).join('')}
            </div>
            ` : ''}
            <h1>${uiConfig.header.title}</h1>
            <p class="subtitle">${uiConfig.header.subtitle}</p>
            ${uiConfig.customHtml.headerExtra}
        </header>

        <div class="overall-status" id="overallStatus">
            <div class="loading-spinner"></div>
            <div class="status-text">
                <div class="status-title">Loading status...</div>
            </div>
        </div>

        <div class="stats-grid" id="statsGrid" style="display: none;"></div>

        <div id="servicesGroups">
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading services...</p>
            </div>
        </div>

        <footer>
            <div id="lastUpdate" style="margin-bottom: 12px;"></div>
            ${uiConfig.features.showRefreshButton !== false && (uiConfig.api?.enableStatusEndpoint !== false || uiConfig.api?.enableUptimeEndpoint !== false) ? `
            <button class="refresh-btn" onclick="refreshStatus()">
                <span>↻</span>
                <span>Refresh</span>
            </button>
            ` : ''}
        </footer>
    </div>

    <!-- Export Backdrop -->
    <div id="exportBackdrop" class="export-backdrop" onclick="closeExportDialog()"></div>

    <!-- Export Dialog -->
    <div id="exportDialog" class="export-dialog">
        <div class="export-dialog-header">
            <h3 class="export-dialog-title">Export to CSV</h3>
            <button class="export-dialog-close" onclick="closeExportDialog()">×</button>
        </div>

            <div class="export-form-group">
                <label class="export-form-label">Time Period</label>
                <div class="export-quick-ranges">
                    <button class="export-quick-btn" onclick="setQuickRange(7)">Last 7 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange(30)">Last 30 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange(90)">Last 90 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange('all')">All time</button>
                </div>
            </div>

            <div class="export-form-group">
                <label class="export-form-label">Custom Date Range</label>
                <div class="export-date-range">
                    <div>
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">From</label>
                        <input type="date" id="exportStartDate" class="export-form-input" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">To</label>
                        <input type="date" id="exportEndDate" class="export-form-input" />
                    </div>
                </div>
            </div>

            <div class="export-form-group">
                <label class="export-form-label">
                    Select Services
                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: normal; margin-left: 8px;">
                        (<span id="selectedCount">0</span> selected)
                    </span>
                </label>
                <div style="margin-bottom: 8px;">
                    <button class="export-quick-btn" onclick="selectAllServices()">Select All</button>
                    <button class="export-quick-btn" onclick="deselectAllServices()">Deselect All</button>
                </div>
                <div id="exportServicesList" class="export-services-list">
                    <!-- Services will be populated dynamically -->
                </div>
            </div>

            <div class="export-actions">
                <button class="export-btn-secondary" onclick="closeExportDialog()">Cancel</button>
                <button class="export-btn-primary" id="exportButton" onclick="performExport()">Export CSV</button>
            </div>
    </div>

    <footer>
        <p>${uiConfig.footer.text}</p>
        ${uiConfig.footer.links && uiConfig.footer.links.length > 0 ? `
        <div class="footer-links">
            ${uiConfig.footer.links.map(link => `<a href="${link.url}" target="${link.url.startsWith('http') ? '_blank' : '_self'}" rel="${link.url.startsWith('http') ? 'noopener noreferrer' : ''}">${link.text}</a>`).join('')}
        </div>
        ` : ''}
        ${uiConfig.customHtml.footerExtra}
    </footer>
`;
}
