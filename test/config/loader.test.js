import { describe, it, expect } from 'vitest';
import { uiConfig, servicesWithGroups, getUiConfig, buildServicesWithGroups } from '../../src/config/loader.js';

describe('loader caches at module init', () => {
  it('exports uiConfig as a frozen object', () => {
    expect(Object.isFrozen(uiConfig)).toBe(true);
    expect(uiConfig).toBeDefined();
  });
  it('exports servicesWithGroups as a frozen array', () => {
    expect(Object.isFrozen(servicesWithGroups)).toBe(true);
    expect(Array.isArray(servicesWithGroups)).toBe(true);
  });
  it('backward-compat functions return the cached values', () => {
    expect(getUiConfig()).toBe(uiConfig);
    expect(buildServicesWithGroups()).toBe(servicesWithGroups);
  });
});
