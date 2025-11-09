/**
 * Configuration Loader
 * Handles loading and merging configuration files
 */

import servicesConfig from '../../config/services.json';
import dashboardConfig from '../../config/dashboard.json';
import settingsConfig from '../../config/settings.json';
import legacyUiConfig from '../../config/ui.json';

/**
 * Build services map with group configurations merged
 * Service-level settings override group-level settings
 */
export function buildServicesWithGroups() {
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
export function getUiConfig() {
  // Merge new configs
  const mergedConfig = {
    ...dashboardConfig,
    features: settingsConfig.features,
    uptimeThresholds: settingsConfig.uptimeThresholds,
    uptimeRetentionDays: settingsConfig.uptime?.retentionDays || legacyUiConfig.features?.uptimeRetentionDays || 120
  };
  
  // Use new config structure if dashboard.json exists, otherwise fall back to ui.json
  return dashboardConfig ? mergedConfig : legacyUiConfig;
}

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

