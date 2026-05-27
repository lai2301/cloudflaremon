import { describe, it, expect } from 'vitest';
import { renderScripts } from '../../src/handlers/dashboard/scripts.js';

const baseArgs = {
  uiConfig: {
    branding: { pageTitle: 'X' },
    features: { autoRefreshInterval: 30, autoRefreshSeconds: 0 },
    theme: { defaultMode: 'auto' },
    alertNotifications: {
      pollingIntervalSeconds: 10,
      localStorageKey: 'last-alert-timestamp',
      severityFilter: [],
      enableToastNotifications: true,
      enableBrowserNotifications: true,
    },
    uptimeThresholds: {
      default: [
        { name: 'excellent', label: 'Excellent', min: 99, color: '#10b981' },
        { name: 'good', label: 'Good', min: 95, color: '#f59e0b' },
        { name: 'poor', label: 'Poor', min: 0, color: '#ef4444' },
      ],
    },
    uptimeRetentionDays: 90,
  },
  processedServices: [],
  monitorData: { latest: {}, summary: null, uptime: {} },
};

describe('renderScripts', () => {
  it('wraps output in <script> tags', () => {
    const out = renderScripts(baseArgs);
    expect(out.trimStart().startsWith('<script>')).toBe(true);
    expect(out.trimEnd().endsWith('</script>')).toBe(true);
  });

  it('embeds SERVICES_CONFIG and EMBEDDED_MONITOR_DATA', () => {
    const out = renderScripts(baseArgs);
    expect(out).toContain('SERVICES_CONFIG');
    expect(out).toContain('EMBEDDED_MONITOR_DATA');
  });

  it('embeds ALERT_NOTIFICATION_CONFIG', () => {
    const out = renderScripts(baseArgs);
    expect(out).toContain('ALERT_NOTIFICATION_CONFIG');
  });

  it('interpolates the default theme mode', () => {
    const out = renderScripts(baseArgs);
    expect(out).toContain("const defaultTheme = 'auto'");
  });

  it('serialises processedServices as JSON', () => {
    const args = { ...baseArgs, processedServices: [{ id: 'svc1', name: 'Service 1' }] };
    const out = renderScripts(args);
    expect(out).toContain('"svc1"');
  });

  it('serialises monitorData as JSON', () => {
    const args = {
      ...baseArgs,
      monitorData: { latest: { svc1: 1234567890 }, summary: null, uptime: {} },
    };
    const out = renderScripts(args);
    expect(out).toContain('1234567890');
  });
});
