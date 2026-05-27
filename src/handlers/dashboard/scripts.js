export function renderScripts({ uiConfig, processedServices, monitorData }) {
  return `    <script>
        // Embedded services configuration (avoids API call if Cloudflare Access is enabled)
        const SERVICES_CONFIG = ${JSON.stringify(processedServices)};
        
        // Embedded monitor data (eliminates API calls and caching issues)
        const EMBEDDED_MONITOR_DATA = ${JSON.stringify(monitorData)};
        
        // Alert notification configuration
        const ALERT_NOTIFICATION_CONFIG = ${JSON.stringify(uiConfig.alertNotifications)};
        
        // Client-side icon SVG strings (referenced from DOM-building template literals)
        const ICONS = {
            bell: '<svg class="icon" aria-hidden="true"><use href="#icon-bell"/></svg>',
            moon: '<svg class="icon" aria-hidden="true"><use href="#icon-moon"/></svg>',
            sun: '<svg class="icon" aria-hidden="true"><use href="#icon-sun"/></svg>',
            check: '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>',
            x: '<svg class="icon" aria-hidden="true"><use href="#icon-x"/></svg>',
            'alert-octagon': '<svg class="icon" aria-hidden="true"><use href="#icon-alert-octagon"/></svg>',
            'alert-triangle': '<svg class="icon" aria-hidden="true"><use href="#icon-alert-triangle"/></svg>',
            info: '<svg class="icon" aria-hidden="true"><use href="#icon-info"/></svg>',
            activity: '<svg class="icon" aria-hidden="true"><use href="#icon-activity"/></svg>',
            radio: '<svg class="icon" aria-hidden="true"><use href="#icon-radio"/></svg>',
            inbox: '<svg class="icon icon--xl" aria-hidden="true"><use href="#icon-inbox"/></svg>',
            clock: '<svg class="icon" aria-hidden="true"><use href="#icon-clock"/></svg>',
            'refresh-cw': '<svg class="icon" aria-hidden="true"><use href="#icon-refresh-cw"/></svg>',
        };
        
        // Theme management
        const THEME_KEY = 'theme-preference';
        const defaultTheme = '${uiConfig.theme.defaultMode}';
        
        function getSystemTheme() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        function getTheme() {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored && stored !== 'auto') return stored;
            return defaultTheme === 'auto' ? getSystemTheme() : defaultTheme;
        }
        
        function setTheme(theme) {
            if (theme === 'auto') {
                theme = getSystemTheme();
            }
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
        
        function updateThemeIcon(theme) {
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
            }
        }
        
        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, newTheme);
            setTheme(newTheme);
        }
        
        // Initialize theme
        setTheme(getTheme());
        
        // Add toggle listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === 'auto' || !stored) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
        
        // Cache for uptime data
        const uptimeCache = {};

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h ago\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m ago\`;
            if (minutes > 0) return \`\${minutes}m ago\`;
            return \`\${seconds}s ago\`;
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Custom tooltip functionality
        let tooltipElement = null;
        
        function initTooltip() {
            if (!tooltipElement) {
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'custom-tooltip';
                document.body.appendChild(tooltipElement);
            }
        }
        
        function showTooltip(text, event) {
            if (!tooltipElement) initTooltip();
            tooltipElement.textContent = text;
            tooltipElement.classList.add('show');
            updateTooltipPosition(event);
        }
        
        function hideTooltip() {
            if (tooltipElement) {
                tooltipElement.classList.remove('show');
            }
        }
        
        function updateTooltipPosition(event) {
            if (!tooltipElement) return;
            const x = event.clientX + 10;
            const y = event.clientY + 10;
            tooltipElement.style.left = x + 'px';
            tooltipElement.style.top = y + 'px';
        }

        function generateUptimeBar(uptimeData) {
            if (!uptimeData || !uptimeData.days || uptimeData.days.length === 0) {
                // Fallback: generate days based on retention period with no data
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
                const today = new Date();
                let html = '';
                for (let i = retentionDays - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    const tooltipText = formatDate(dateStr) + ' - No data available';
                    html += '<div class="uptime-day unknown" data-tooltip="' + escapeHtml(tooltipText) + '"></div>';
                }
                return html;
            }

            let html = '';
            uptimeData.days.forEach(day => {
                let dayStatus = 'unknown';
                let tooltipText = formatDate(day.date) + ' - No data available';
                
                if (day.totalChecks > 0) {
                    const uptimePercent = parseFloat(day.uptimePercentage);
                    if (uptimePercent >= 99) {
                        dayStatus = 'up';
                    } else if (uptimePercent >= 90) {
                        dayStatus = 'degraded';
                    } else if (uptimePercent >= 0) {
                        dayStatus = 'down';
                    }
                    tooltipText = formatDate(day.date) + ' | Uptime: ' + day.uptimePercentage + '% | Checks: ' + day.totalChecks + ' (up:' + day.upChecks + ' down:' + day.downChecks + ')';
                }
                
                html += '<div class="uptime-day ' + dayStatus + '" data-tooltip="' + escapeHtml(tooltipText) + '"></div>';
            });
            
            return html;
        }
        
        function attachTooltipListeners() {
            document.addEventListener('mouseover', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    const tooltipText = e.target.getAttribute('data-tooltip');
                    if (tooltipText) {
                        showTooltip(tooltipText, e);
                    }
                }
            });
            
            document.addEventListener('mousemove', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    updateTooltipPosition(e);
                }
            });
            
            document.addEventListener('mouseout', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    hideTooltip();
                }
            });
        }

        async function fetchUptimeData(serviceId) {
            if (uptimeCache[serviceId]) {
                return uptimeCache[serviceId];
            }
            
            // Check if embedded data has uptime for this service
            if (typeof EMBEDDED_MONITOR_DATA !== 'undefined' && EMBEDDED_MONITOR_DATA && EMBEDDED_MONITOR_DATA.uptime && EMBEDDED_MONITOR_DATA.uptime[serviceId]) {
                const serviceUptime = EMBEDDED_MONITOR_DATA.uptime[serviceId];
                const existingDays = serviceUptime.days || {};
                
                // Fill in missing days up to retention period (same as API does)
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
                const today = new Date();
                const historicalDays = [];
                let totalChecksAll = 0;
                let upChecksAll = 0;
                let degradedChecksAll = 0;
                let unknownChecksAll = 0;
                
                for (let i = retentionDays - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    const dayData = existingDays[dateStr];
                    if (dayData) {
                        historicalDays.push(dayData);
                        totalChecksAll += dayData.totalChecks || 0;
                        upChecksAll += dayData.upChecks || 0;
                        degradedChecksAll += dayData.degradedChecks || 0;
                        unknownChecksAll += dayData.unknownChecks || 0;
                    } else {
                        // Fill in missing days with empty data
                        historicalDays.push({
                            date: dateStr,
                            totalChecks: 0,
                            upChecks: 0,
                            downChecks: 0,
                            degradedChecks: 0,
                            unknownChecks: 0,
                            uptimePercentage: null
                        });
                    }
                }
                
                // Calculate overall uptime
                const knownChecksAll = totalChecksAll - unknownChecksAll;
                const overallUptime = knownChecksAll > 0 
                    ? parseFloat(((upChecksAll + degradedChecksAll * 0.5) / knownChecksAll * 100).toFixed(2))
                    : 0;
                
                const data = {
                    serviceId: serviceId,
                    days: historicalDays,
                    overallUptime: overallUptime,
                    totalDays: historicalDays.filter(d => d.totalChecks > 0).length,
                    retentionDays: retentionDays
                };
                
                uptimeCache[serviceId] = data;
                return data;
            }
            
            // Fallback to API if embedded data not available
            try {
                const response = await fetch(\`/api/uptime?serviceId=\${serviceId}\`);
                const data = await response.json();
                uptimeCache[serviceId] = data;
                return data;
            } catch (error) {
                console.error(\`Error fetching uptime for \${serviceId}:\`, error);
                return null;
            }
        }
        
        async function loadStatus() {
            try {
                // Use embedded data if available (initial page load), otherwise fetch from API (refresh)
                let data;
                if (typeof EMBEDDED_MONITOR_DATA !== 'undefined' && EMBEDDED_MONITOR_DATA && EMBEDDED_MONITOR_DATA.summary) {
                    data = { summary: EMBEDDED_MONITOR_DATA.summary };
                    //console.log('Using embedded monitor data (no API call needed)');
                } else {
                    const response = await fetch('/api/status');
                    if (!response.ok) {
                        throw new Error(\`HTTP error! status: \${response.status}\`);
                    }
                    data = await response.json();
                    console.log('Fetched fresh data from API');
                }
                
                if (!data.summary) {
                    const bannerEl = document.getElementById('overallStatus');
                    bannerEl.className = 'status-banner status-banner--unknown';
                    bannerEl.querySelector('.status-banner__title').textContent = 'No data available';
                    bannerEl.querySelector('.status-banner__meta').textContent = 'Waiting for first status check...';
                    document.getElementById('servicesGroups').innerHTML = '<div class="loading"><p>No services data yet. Wait for the cron job to run.</p></div>';
                    return;
                }

                const summary = data.summary;
                const hasDown = summary.servicesDown > 0;
                const hasDegraded = summary.servicesDegraded > 0;

                // Determine aggregate state
                let bannerState, bannerTitle;
                if (hasDown) {
                    bannerState = 'down';
                    bannerTitle = 'Major outage detected';
                } else if (hasDegraded) {
                    bannerState = 'degraded';
                    bannerTitle = 'Partial outage detected';
                } else if (summary.totalServices > 0) {
                    bannerState = 'up';
                    bannerTitle = 'All systems operational';
                } else {
                    bannerState = 'unknown';
                    bannerTitle = 'Status unknown';
                }

                // Update banner
                const bannerEl = document.getElementById('overallStatus');
                bannerEl.className = \`status-banner status-banner--\${bannerState}\`;
                bannerEl.removeAttribute('aria-busy');
                bannerEl.querySelector('.status-banner__title').textContent = bannerTitle;
                bannerEl.querySelector('.status-banner__meta').textContent =
                    'Updated ' + formatDuration(Date.now() - new Date(summary.timestamp).getTime());

                // Update summary pills
                document.querySelector('[data-stat="total"]').textContent   = summary.totalServices;
                document.querySelector('[data-stat="up"]').textContent      = summary.servicesUp;
                document.querySelector('[data-stat="degraded"]').textContent = summary.servicesDegraded;
                document.querySelector('[data-stat="down"]').textContent    = summary.servicesDown;
                document.querySelector('[data-stat="unknown"]').textContent = summary.servicesUnknown ?? 0;
                
                // Update services - fetch uptime data for each service
                document.getElementById('servicesGroups').innerHTML = '<div class="loading"><p>Loading uptime data...</p></div>';
                
                const servicesWithUptime = await Promise.all(summary.results.map(async (service) => {
                    try {
                        const uptimeData = await fetchUptimeData(service.serviceId);
                        return { service, uptimeData };
                    } catch (error) {
                        console.error(\`Error fetching uptime for \${service.serviceId}:\`, error);
                        return { service, uptimeData: null };
                    }
                }));
                
                // Group services by groupName and track threshold set
                const groupedServices = {};
                servicesWithUptime.forEach(({ service, uptimeData }) => {
                    const groupName = service.groupName || 'Ungrouped';
                    const thresholdSet = service.uptimeThresholdSet || 'default';
                    if (!groupedServices[groupName]) {
                        groupedServices[groupName] = {
                            thresholdSet: thresholdSet,
                            services: []
                        };
                    }
                    groupedServices[groupName].services.push({ service, uptimeData });
                });
                
                // All threshold sets for client-side use
                const allThresholds = ${JSON.stringify(uiConfig.uptimeThresholds)};
                
                // Generate HTML for each group
                const groupsHtml = Object.entries(groupedServices).map(([groupName, groupData]) => {
                    const thresholds = allThresholds[groupData.thresholdSet] || allThresholds['default'];
                    
                    const servicesHtml = groupData.services.map(({ service, uptimeData }) => {
                    try {
                        const icon = service.status === 'up' ? ICONS.check : (service.status === 'down' ? ICONS.x : '');
                        const timeSince = service.lastSeen ? formatDuration(Date.now() - new Date(service.lastSeen).getTime()) : 'Never';
                        const uptime = uptimeData && uptimeData.overallUptime > 0 ? \`\${uptimeData.overallUptime}%\` : 'N/A';
                        
                        // Calculate uptime threshold class using group's threshold set
                        let uptimeClass = '';
                        if (uptimeData && uptimeData.overallUptime > 0) {
                            const percentage = uptimeData.overallUptime;
                            // Sort thresholds by min value descending and find the first match
                            const sortedThresholds = [...thresholds].sort((a, b) => b.min - a.min);
                            const matchedThreshold = sortedThresholds.find(t => percentage >= t.min);
                            if (matchedThreshold) {
                                uptimeClass = \`uptime-\${matchedThreshold.name}\`;
                            }
                        }
                        
                        return \`
                        <div class="service-card">
                            <div class="service-card__row">
                                <span class="status-dot status-dot--\${service.status}"></span>
                                <div class="service-card__identity">
                                    <div class="service-card__name">\${service.serviceName}</div>
                                    <div class="service-card__meta">Last check \${timeSince}</div>
                                </div>
                                <div class="service-card__pct \${uptimeClass}">\${uptime}</div>
                            </div>
                            <div class="service-card__bar">
                                <div class="uptime-bar-wrapper">
                                    <div class="uptime-bar">
                                        \${generateUptimeBar(uptimeData)}
                                    </div>
                                </div>
                                <div class="uptime-labels">
                                    <span>\${uptimeData?.retentionDays || ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90}} days ago</span>
                                    <span>Today</span>
                                </div>
                            </div>
                        </div>
                        \`;
                    } catch (error) {
                        console.error('Error rendering service:', service.serviceName, error);
                        return \`<div class="service-card"><div class="service-card__name">Error loading \${service.serviceName}</div></div>\`;
                    }
                    }).join('');
                    
                    // Generate threshold legend for this group
                    const legendHtml = thresholds.map(threshold => \`
                        <div class="threshold-item">
                            <div class="threshold-badge" style="background: \${threshold.color}15; border-color: \${threshold.color}40;"></div>
                            <span style="color: var(--text-secondary);">\${threshold.label} ≥\${threshold.min}%</span>
                        </div>
                    \`).join('');
                    
                    // Return the group container with header, legend, and services
                    return \`
                        <div class="services-container">
                            <div class="services-header">
                                <div class="services-title">\${groupName}</div>
                                <div class="threshold-legend">
                                    \${legendHtml}
                                </div>
                            </div>
                            <div class="services-list">
                                \${servicesHtml}
                            </div>
                        </div>
                    \`;
                }).join('');
                
                const servicesGroupsEl = document.getElementById('servicesGroups');
                servicesGroupsEl.removeAttribute('aria-busy');
                servicesGroupsEl.innerHTML = groupsHtml;
                document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date(summary.timestamp).toLocaleString()}\`;
                
                // Scroll all uptime bars to the right (most recent dates)
                setTimeout(() => {
                    const uptimeWrappers = document.querySelectorAll('.uptime-bar-wrapper');
                    uptimeWrappers.forEach(wrapper => {
                        wrapper.scrollLeft = wrapper.scrollWidth;
                    });
                }, 50);
                
            } catch (error) {
                console.error('Error loading status:', error);
                const bannerEl = document.getElementById('overallStatus');
                bannerEl.className = 'status-banner status-banner--down';
                bannerEl.querySelector('.status-banner__title').textContent = 'Error loading data';
                bannerEl.querySelector('.status-banner__meta').textContent = 'Failed to fetch status information. Check console for details.';
                document.getElementById('servicesGroups').innerHTML = \`
                    <div class="loading">
                        <p>Error: \${error.message}</p>
                        <p>Check browser console for more details</p>
                    </div>
                \`;
            }
        }
        
        // Clear cache and reload
        function refreshStatus() {
            // Clear uptime cache
            Object.keys(uptimeCache).forEach(key => delete uptimeCache[key]);
            loadStatus();
        }
        
        // Initialize tooltip system
        initTooltip();
        attachTooltipListeners();
        
        // Load status on page load
        loadStatus();
        
        // Auto-refresh functionality
        const AUTO_REFRESH_KEY = 'auto-refresh-interval';
        const DEFAULT_REFRESH_SECONDS = ${uiConfig.features.autoRefreshSeconds || 0};
        let autoRefreshInterval = null;
        let autoRefreshCountdown = null;
        let autoRefreshSecondsLeft = 0;
        
        function getAutoRefreshInterval() {
            const stored = localStorage.getItem(AUTO_REFRESH_KEY);
            return stored !== null ? parseInt(stored) : DEFAULT_REFRESH_SECONDS;
        }
        
        function setAutoRefreshInterval(seconds) {
            localStorage.setItem(AUTO_REFRESH_KEY, seconds.toString());
            startAutoRefresh(seconds);
            updateAutoRefreshUI(seconds);
        }
        
        function startAutoRefresh(seconds) {
            // Clear existing intervals
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            if (autoRefreshCountdown) clearInterval(autoRefreshCountdown);
            
            const btn = document.getElementById('autoRefreshBtn');
            const timer = document.getElementById('autoRefreshTimer');
            
            if (seconds > 0) {
                // Enable auto-refresh
                btn.classList.add('active');
                timer.style.display = 'block';
                autoRefreshSecondsLeft = seconds;
                
                // Update countdown every second
                autoRefreshCountdown = setInterval(() => {
                    autoRefreshSecondsLeft--;
                    timer.textContent = autoRefreshSecondsLeft;
                    
                    if (autoRefreshSecondsLeft <= 0) {
                        autoRefreshSecondsLeft = seconds;
                    }
                }, 1000);
                
                // Refresh data at interval
                autoRefreshInterval = setInterval(() => {
                    loadStatus();
                    autoRefreshSecondsLeft = seconds;
                }, seconds * 1000);
                
                timer.textContent = seconds;
            } else {
                // Disable auto-refresh
                btn.classList.remove('active');
                timer.style.display = 'none';
                autoRefreshSecondsLeft = 0;
            }
        }
        
        function updateAutoRefreshUI(currentSeconds) {
            const menuItems = document.querySelectorAll('.auto-refresh-menu-item');
            menuItems.forEach(item => {
                const seconds = parseInt(item.getAttribute('data-seconds'));
                if (seconds === currentSeconds) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        // Initialize auto-refresh
        const initialRefreshInterval = getAutoRefreshInterval();
        startAutoRefresh(initialRefreshInterval);
        updateAutoRefreshUI(initialRefreshInterval);
        
        // Toggle auto-refresh menu
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        const autoRefreshMenu = document.getElementById('autoRefreshMenu');
        let autoRefreshMenuOpen = false;
        
        if (autoRefreshBtn) {
            autoRefreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                autoRefreshMenuOpen = !autoRefreshMenuOpen;
                if (autoRefreshMenuOpen) {
                    autoRefreshMenu.classList.add('show');
                } else {
                    autoRefreshMenu.classList.remove('show');
                }
            });
        }
        
        // Handle menu item clicks
        document.querySelectorAll('.auto-refresh-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const seconds = parseInt(item.getAttribute('data-seconds'));
                setAutoRefreshInterval(seconds);
                autoRefreshMenu.classList.remove('show');
                autoRefreshMenuOpen = false;
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (autoRefreshMenuOpen && !autoRefreshMenu.contains(e.target) && !autoRefreshBtn.contains(e.target)) {
                autoRefreshMenu.classList.remove('show');
                autoRefreshMenuOpen = false;
            }
        });
        
        // Alert Notifications
        const ALERT_CHECK_INTERVAL = (ALERT_NOTIFICATION_CONFIG.pollingIntervalSeconds || 10) * 1000;
        const LAST_ALERT_TIMESTAMP_KEY = ALERT_NOTIFICATION_CONFIG.localStorageKey || 'last-alert-timestamp';
        const SEVERITY_FILTER = ALERT_NOTIFICATION_CONFIG.severityFilter || [];
        const ENABLE_TOAST_NOTIFICATIONS = ALERT_NOTIFICATION_CONFIG.enableToastNotifications !== false;
        const ENABLE_BROWSER_NOTIFICATIONS = ALERT_NOTIFICATION_CONFIG.enableBrowserNotifications !== false;
        let alertCheckInterval = null;
        
        function getLastAlertTimestamp() {
            return localStorage.getItem(LAST_ALERT_TIMESTAMP_KEY) || new Date(0).toISOString();
        }
        
        function setLastAlertTimestamp(timestamp) {
            localStorage.setItem(LAST_ALERT_TIMESTAMP_KEY, timestamp);
        }
        
        function shouldShowNotification(alert) {
            // If no severity filter is set (empty array), show all alerts
            if (!SEVERITY_FILTER || SEVERITY_FILTER.length === 0) {
                return true;
            }
            // Check if alert severity matches any in the filter
            return SEVERITY_FILTER.includes(alert.severity?.toLowerCase());
        }
        
        function mapSeverityClass(severity) {
            const s = severity?.toLowerCase();
            if (s === 'critical' || s === 'error') return 'critical';
            if (s === 'warning') return 'warning';
            if (s === 'info' || s === 'success') return 'info';
            return 'service';
        }

        function showToastNotification(alert) {
            // Check if toast notifications are enabled
            if (!ENABLE_TOAST_NOTIFICATIONS) return;

            // Check if alert passes severity filter
            if (!shouldShowNotification(alert)) return;

            const container = document.getElementById('alertToastContainer');
            if (!container) return;

            const severityClass = mapSeverityClass(alert.severity);
            const iconMap = {
                critical: 'alert-octagon',
                warning: 'alert-triangle',
                info: 'info',
                service: 'activity'
            };
            const iconKey = iconMap[severityClass] || 'info';

            const div = document.createElement('div');
            div.className = \`alert-toast alert-toast--\${severityClass}\`;
            div.setAttribute('role', 'alert');
            div.innerHTML = \`
                <div class="alert-toast__bar"></div>
                <div class="alert-toast__icon">\${ICONS[iconKey]}</div>
                <div class="alert-toast__body">
                    <div class="alert-toast__title">\${escapeHtml(alert.title || 'Alert')}</div>
                    <div class="alert-toast__message">\${escapeHtml(alert.message || '')}</div>
                </div>
                <button class="alert-toast__close" aria-label="Dismiss" type="button">\${ICONS.x}</button>
            \`;

            div.querySelector('.alert-toast__close').addEventListener('click', () => div.remove());
            container.appendChild(div);

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                div.remove();
            }, 10000);
        }
        
        function showBrowserNotification(alert) {
            // Check if browser notifications are enabled
            if (!ENABLE_BROWSER_NOTIFICATIONS) return;
            
            // Check if alert passes severity filter
            if (!shouldShowNotification(alert)) return;
            
            // Check if browser supports notifications
            if (!('Notification' in window)) {
                return;
            }
            
            // Check if permission is granted
            if (Notification.permission === 'granted') {
                new Notification(alert.title, {
                    body: alert.message,
                    icon: getSeverityIcon(alert.severity),
                    tag: alert.id,
                    timestamp: new Date(alert.timestamp).getTime()
                });
            } else if (Notification.permission !== 'denied') {
                // Request permission
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(alert.title, {
                            body: alert.message,
                            icon: getSeverityIcon(alert.severity),
                            tag: alert.id
                        });
                    }
                });
            }
        }
        
        async function checkForNewAlerts() {
            try {
                const since = getLastAlertTimestamp();
                const response = await fetch(\`/api/alerts/recent?since=\${encodeURIComponent(since)}&limit=10\`);
                const data = await response.json();
                
                if (data.success && data.alerts && data.alerts.length > 0) {
                    // Show notifications for new alerts
                    data.alerts.forEach(alert => {
                        showToastNotification(alert);
                        showBrowserNotification(alert);
                    });
                    
                    // Update last seen timestamp to the most recent alert
                    const latestTimestamp = data.alerts[0].timestamp;
                    setLastAlertTimestamp(latestTimestamp);
                }
            } catch (error) {
                console.error('Error checking for alerts:', error);
            }
        }
        
        // Start checking for alerts
        checkForNewAlerts();
        alertCheckInterval = setInterval(checkForNewAlerts, ALERT_CHECK_INTERVAL);
        
        // Export functionality
        let exportServices = [];
        let exportDialogOpen = false;
        
        // Initialize export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', toggleExportDialog);
        }
        
        // Close dialog when clicking escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && exportDialogOpen) {
                closeExportDialog();
            }
        });
        
        function toggleExportDialog() {
            if (exportDialogOpen) {
                closeExportDialog();
            } else {
                openExportDialog();
            }
        }
        
        function openExportDialog() {
            try {
                // Use embedded services configuration (no API call needed)
                if (!Array.isArray(SERVICES_CONFIG)) {
                    throw new Error('Invalid services configuration');
                }
                
                exportServices = SERVICES_CONFIG.filter(s => s.enabled);
                
                if (exportServices.length === 0) {
                    alert('No enabled services found to export.');
                    return;
                }
                
                populateExportServices();
                
                // Set default dates
                const today = new Date();
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                
                document.getElementById('exportStartDate').valueAsDate = thirtyDaysAgo;
                document.getElementById('exportEndDate').valueAsDate = today;
                
                document.getElementById('exportDialog').classList.add('active');
                document.getElementById('exportBackdrop').classList.add('active');
                document.getElementById('exportBtn').classList.add('active');
                exportDialogOpen = true;
            } catch (err) {
                console.error('Error loading services for export:', err);
                alert(\`Failed to load services: \${err.message}\\n\\nPlease check the console for details.\`);
            }
        }
        
        function closeExportDialog() {
            document.getElementById('exportDialog').classList.remove('active');
            document.getElementById('exportBackdrop').classList.remove('active');
            document.getElementById('exportBtn').classList.remove('active');
            exportDialogOpen = false;
        }
        
        function populateExportServices() {
            const listContainer = document.getElementById('exportServicesList');
            listContainer.innerHTML = exportServices.map(service => \`
                <div class="export-service-item">
                    <input type="checkbox" 
                           class="export-service-checkbox" 
                           id="export-\${service.id}" 
                           value="\${service.id}"
                           onchange="updateSelectedCount()">
                    <label class="export-service-label" for="export-\${service.id}">
                        \${service.name}
                        <span style="color: var(--text-secondary); font-size: 12px; margin-left: 4px;">
                            (\${service.groupName || 'Ungrouped'})
                        </span>
                    </label>
                </div>
            \`).join('');
            
            // Select all by default
            selectAllServices();
        }
        
        function updateSelectedCount() {
            const checked = document.querySelectorAll('.export-service-checkbox:checked').length;
            document.getElementById('selectedCount').textContent = checked;
            document.getElementById('exportButton').disabled = checked === 0;
        }
        
        function selectAllServices() {
            document.querySelectorAll('.export-service-checkbox').forEach(cb => {
                cb.checked = true;
            });
            updateSelectedCount();
        }
        
        function deselectAllServices() {
            document.querySelectorAll('.export-service-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedCount();
        }
        
        function setQuickRange(days) {
            const endDate = new Date();
            let startDate = new Date();
            
            if (days === 'all') {
                // Set to earliest possible date (2020 or retention period)
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
                startDate.setDate(endDate.getDate() - retentionDays);
            } else {
                startDate.setDate(endDate.getDate() - days);
            }
            
            document.getElementById('exportStartDate').valueAsDate = startDate;
            document.getElementById('exportEndDate').valueAsDate = endDate;
        }
        
        async function performExport() {
            const startDateInput = document.getElementById('exportStartDate').value;
            const endDateInput = document.getElementById('exportEndDate').value;
            const selectedServiceIds = Array.from(
                document.querySelectorAll('.export-service-checkbox:checked')
            ).map(cb => cb.value);
            
            if (!startDateInput || !endDateInput) {
                alert('Please select both start and end dates.');
                return;
            }
            
            if (selectedServiceIds.length === 0) {
                alert('Please select at least one service.');
                return;
            }
            
            const startDate = new Date(startDateInput);
            const endDate = new Date(endDateInput);
            
            if (startDate > endDate) {
                alert('Start date must be before end date.');
                return;
            }
            
            const exportButton = document.getElementById('exportButton');
            exportButton.disabled = true;
            exportButton.textContent = 'Exporting...';
            
            try {
                // Fetch uptime data for all selected services
                const uptimeDataPromises = selectedServiceIds.map(serviceId =>
                    fetch(\`/api/uptime?serviceId=\${serviceId}\`)
                        .then(res => res.json())
                        .then(data => ({ serviceId, data }))
                );
                
                const allUptimeData = await Promise.all(uptimeDataPromises);
                
                // Generate CSV
                const csv = generateCSV(allUptimeData, startDate, endDate);
                
                // Download CSV
                downloadCSV(csv, \`uptime-export-\${startDateInput}-to-\${endDateInput}.csv\`);
                
                closeExportDialog();
            } catch (error) {
                console.error('Error exporting data:', error);
                alert('Failed to export data. Please try again.');
            } finally {
                exportButton.disabled = false;
                exportButton.textContent = 'Export CSV';
            }
        }
        
        function generateCSV(allUptimeData, startDate, endDate) {
            const rows = [];
            
            // Header
            rows.push(['Date', 'Service Name', 'Service ID', 'Group', 'Status', 'Uptime %', 'Total Checks', 'Up Checks', 'Degraded Checks', 'Down Checks', 'Unknown Checks']);
            
            // Data rows
            allUptimeData.forEach(({ serviceId, data }) => {
                const service = exportServices.find(s => s.id === serviceId);
                const serviceName = service?.name || serviceId;
                const groupName = service?.groupName || 'Ungrouped';
                
                // If no data or no historical days, create empty rows for the date range
                if (!data || !data.days || data.days.length === 0) {
                    // Generate empty rows for each day in the range
                    const currentDate = new Date(startDate);
                    while (currentDate <= endDate) {
                        rows.push([
                            currentDate.toISOString().split('T')[0],
                            serviceName,
                            serviceId,
                            groupName,
                            'No Data',
                            'N/A',
                            0,
                            0,
                            0,
                            0,
                            0
                        ]);
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    return;
                }
                
                data.days.forEach(day => {
                    const dayDate = new Date(day.date);
                    if (dayDate >= startDate && dayDate <= endDate) {
                        const totalChecks = day.totalChecks || 0;
                        const upChecks = day.upChecks || 0;
                        const degradedChecks = day.degradedChecks || 0;
                        const downChecks = day.downChecks || 0;
                        const unknownChecks = day.unknownChecks || 0;
                        const uptime = totalChecks > 0 
                            ? ((upChecks + degradedChecks) / totalChecks * 100).toFixed(2)
                            : 'N/A';
                        
                        let status = 'No Data';
                        if (totalChecks > 0) {
                            if (downChecks > 0) status = 'Down';
                            else if (degradedChecks > 0) status = 'Degraded';
                            else if (upChecks > 0) status = 'Up';
                        }
                        
                        rows.push([
                            day.date,
                            serviceName,
                            serviceId,
                            groupName,
                            status,
                            uptime,
                            totalChecks,
                            upChecks,
                            degradedChecks,
                            downChecks,
                            unknownChecks
                        ]);
                    }
                });
            });
            
            // Convert to CSV string
            return rows.map(row => 
                row.map(cell => {
                    const cellStr = String(cell);
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\\n')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(',')
            ).join('\\n');
        }
        
        function downloadCSV(csvContent, filename) {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        }
        
        // Alert History functionality
        let allAlerts = [];
        let currentFilter = 'all';
        
        async function openAlertHistory() {
            const modal = document.getElementById('alertHistoryModal');
            modal.classList.add('active');
            
            // Load alerts
            await loadAlertHistory();
        }
        
        function closeAlertHistory() {
            const modal = document.getElementById('alertHistoryModal');
            modal.classList.remove('active');
        }
        
        async function loadAlertHistory() {
            const bodyElement = document.getElementById('alertHistoryBody');
            bodyElement.innerHTML = \`<div class="alert-history-empty"><div class="alert-history-empty-icon">\${ICONS.clock}</div><div>Loading alerts...</div></div>\`;
            
            try {
                const response = await fetch('/api/alerts/recent?limit=1000');
                const data = await response.json();
                
                if (data.success) {
                    allAlerts = data.alerts || [];
                    renderAlertHistory();
                } else {
                    bodyElement.innerHTML = \`<div class="alert-history-empty"><div class="alert-history-empty-icon">\${ICONS.x}</div><div>Failed to load alerts</div></div>\`;
                }
            } catch (error) {
                console.error('Error loading alert history:', error);
                bodyElement.innerHTML = \`<div class="alert-history-empty"><div class="alert-history-empty-icon">\${ICONS.x}</div><div>Error loading alerts</div></div>\`;
            }
        }
        
        function filterAlerts(filter) {
            currentFilter = filter;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.dataset.filter === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            renderAlertHistory();
        }
        
        function renderAlertHistory() {
            const bodyElement = document.getElementById('alertHistoryBody');
            
            if (allAlerts.length === 0) {
                bodyElement.innerHTML = \`<div class="alert-history-empty"><div class="alert-history-empty-icon">\${ICONS.inbox}</div><div>No alerts found</div></div>\`;
                return;
            }
            
            // Filter alerts
            let filteredAlerts = allAlerts;
            
            if (currentFilter !== 'all') {
                if (currentFilter === 'external') {
                    // Show all non-heartbeat-monitor alerts
                    filteredAlerts = allAlerts.filter(alert => alert.source !== 'heartbeat-monitor');
                } else if (currentFilter === 'heartbeat-monitor') {
                    // Show only heartbeat-monitor alerts
                    filteredAlerts = allAlerts.filter(alert => alert.source === 'heartbeat-monitor');
                } else {
                    // Filter by severity
                    filteredAlerts = allAlerts.filter(alert => alert.severity === currentFilter);
                }
            }
            
            if (filteredAlerts.length === 0) {
                bodyElement.innerHTML = \`<div class="alert-history-empty"><div class="alert-history-empty-icon">\${ICONS.info}</div><div>No alerts match this filter</div></div>\`;
                return;
            }
            
            // Render alerts
            const html = filteredAlerts.map(alert => {
                const timestamp = new Date(alert.timestamp);
                const formattedDate = timestamp.toLocaleString();
                const severityIcon = alert.severity === 'critical' ? ICONS['alert-octagon'] :
                                     alert.severity === 'warning' ? ICONS['alert-triangle'] : ICONS.info;
                const sourceIcon = alert.source === 'heartbeat-monitor' ? ICONS.activity : ICONS.radio;
                const sourceName = alert.source === 'heartbeat-monitor' ? 'Service Monitor' : 
                                  alert.source === 'grafana' ? 'Grafana' :
                                  alert.source === 'alertmanager' ? 'Alertmanager' :
                                  alert.source || 'External';
                
                return \`
                    <div class="alert-history-item severity-\${alert.severity}">
                        <div class="alert-history-item-header">
                            <div class="alert-history-item-title">
                                \${severityIcon} \${alert.title}
                            </div>
                            <div class="alert-history-item-badge \${alert.severity}">
                                \${alert.severity}
                            </div>
                        </div>
                        <div class="alert-history-item-message">
                            \${alert.message}
                        </div>
                        <div class="alert-history-item-footer">
                            <div class="alert-history-item-source">
                                <span>\${sourceIcon}</span>
                                <span>\${sourceName}</span>
                            </div>
                            <div>
                                <span>\${ICONS.clock}</span>
                                <span>\${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
            
            bodyElement.innerHTML = html;
        }
        
        // Alert history button click handler
        document.getElementById('alertHistoryBtn')?.addEventListener('click', openAlertHistory);
        
        // Close modal on backdrop click
        document.getElementById('alertHistoryModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'alertHistoryModal') {
                closeAlertHistory();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('alertHistoryModal');
                if (modal?.classList.contains('active')) {
                    closeAlertHistory();
                }
            }
        });
    </script>
`;
}
