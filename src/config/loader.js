/**
 * Configuration Loader
 * Handles loading and merging configuration files
 */

import servicesConfig from '../../config/services.json' assert { type: 'json' };
import dashboardConfig from '../../config/dashboard.json' assert { type: 'json' };
import settingsConfig from '../../config/settings.json' assert { type: 'json' };
import legacyUiConfig from '../../config/ui.json' assert { type: 'json' };

/**
 * Build services map with group configurations merged
 * Service-level settings override group-level settings
 */
function computeServicesWithGroups() {
  const groups = servicesConfig.groups || [];
  const services = servicesConfig.services || [];

  // Create a map of service ID to group
  const serviceToGroup = new Map();
  groups.forEach(group => {
    group.services?.forEach(serviceId => {
      serviceToGroup.set(serviceId, group);
    });
  });

  // Merge group config with service config
  const mergedServices = services.map(service => {
    const group = serviceToGroup.get(service.id);

    if (!group) {
      // No group, return service as-is with default auth
      return {
        ...service,
        groupId: null,
        groupName: 'Ungrouped',
        uptimeThresholdSet: 'default',
        auth: {
          required: service.auth?.required ?? true
        }
      };
    }

    // Merge group settings with service settings (service overrides group)
    return {
      ...service,
      groupId: group.id,
      groupName: group.name,
      uptimeThresholdSet: service.uptimeThresholdSet || group.uptimeThresholdSet || 'default',
      auth: {
        required: service.auth?.required ?? group.auth?.required ?? true
      }
    };
  });

  return mergedServices;
}

/**
 * Get UI configuration (merged from new or legacy structure)
 */
function computeUiConfig() {
  // Merge new configs
  const mergedConfig = {
    ...dashboardConfig,
    features: settingsConfig.features,
    api: settingsConfig.api || {
      enableStatusEndpoint: true,
      enableUptimeEndpoint: true,
      enableServicesEndpoint: true,
      enableHeartbeatEndpoint: true,
      enableAlertEndpoint: true,
      enableAlertHistoryEndpoint: true,
      enableTestNotificationEndpoint: false
    },
    alertHistory: settingsConfig.alertHistory || {
      defaultRecentPeriodHours: 24,
      defaultLimit: 20
    },
    alertNotifications: settingsConfig.alertNotifications || {
      pollingIntervalSeconds: 10,
      localStorageKey: 'last-alert-timestamp',
      severityFilter: ['critical', 'error', 'warning'],
      enableToastNotifications: true,
      enableBrowserNotifications: true
    },
    uptimeThresholds: settingsConfig.uptimeThresholds,
    uptimeRetentionDays: settingsConfig.uptime?.retentionDays || legacyUiConfig.features?.uptimeRetentionDays || 120,
    allowedOrigins: Array.isArray(settingsConfig.allowedOrigins) ? settingsConfig.allowedOrigins : (Array.isArray(legacyUiConfig.allowedOrigins) ? legacyUiConfig.allowedOrigins : [])
  };

  // Use new config structure if dashboard.json exists, otherwise fall back to ui.json
  return dashboardConfig ? mergedConfig : legacyUiConfig;
}

/**
 * Validate services config for common misconfigurations.
 * Throws on the first detected batch of errors so startup fails fast.
 */
function validateConfig() {
  const errors = [];
  const serviceIds = new Set(servicesConfig.services?.map(s => s.id) || []);
  for (const group of servicesConfig.groups || []) {
    if (!group.id) errors.push('Group missing id');
    if (!Array.isArray(group.services)) {
      errors.push(`Group "${group.id}" services field is not an array`);
      continue;
    }
    for (const sid of group.services) {
      if (!serviceIds.has(sid)) {
        errors.push(`Group "${group.id}" references unknown service "${sid}"`);
      }
    }
  }
  for (const svc of servicesConfig.services || []) {
    if (!svc.id) errors.push('Service missing id');
    if (svc.id && typeof svc.id !== 'string') errors.push(`Service id must be a string, got ${typeof svc.id}`);
  }
  if (errors.length) {
    throw new Error(`Invalid services config:\n  - ${errors.join('\n  - ')}`);
  }
}

// Run validation and compute cached values at module init
validateConfig();

export const uiConfig = Object.freeze(computeUiConfig());
export const servicesWithGroups = Object.freeze(computeServicesWithGroups());

// Backward-compat shims so existing callers still work without changes
export function getUiConfig() { return uiConfig; }
export function buildServicesWithGroups() { return servicesWithGroups; }

/**
 * Get services configuration
 */
export function getServicesConfig() {
  return servicesConfig;
}

/**
 * Get settings configuration
 */
export function getSettingsConfig() {
  return settingsConfig;
}
