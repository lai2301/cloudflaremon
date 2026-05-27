import { describe, it, expect } from 'vitest';
import { renderLayout } from '../../src/handlers/dashboard/layout.js';

const baseArgs = {
  uiConfig: {
    branding: { pageTitle: 'T', favicon: '', logoUrl: '', primaryColor: '#3b82f6', accentColor: '#10b981' },
    header: {
      showLogo: false,
      logoUrl: '',
      logoAlt: '',
      links: [],
      title: 'Test Dashboard',
      subtitle: 'All systems operational',
    },
    footer: { text: 'Footer text', links: [] },
    features: {
      showRefreshButton: true,
      showExportButton: false,
      showAlertHistoryButton: false,
      refreshButton: true,
      lastUpdated: true,
      uptimePercentage: true,
      uptimeHistory: true,
      exportButton: false,
      autoRefreshButton: true,
      autoRefreshInterval: 30,
    },
    theme: { defaultMode: 'auto', showToggle: false, toggle: { enabled: true } },
    api: { enableStatusEndpoint: true, enableUptimeEndpoint: true, enableAlertHistoryEndpoint: true },
    customHtml: { headerExtra: '', footerExtra: '' },
  },
  processedServices: [],
  monitorData: { latest: {}, summary: null, uptime: {} },
};

describe('renderLayout', () => {
  it('returns a string containing the body markup', () => {
    const out = renderLayout(baseArgs);
    expect(typeof out).toBe('string');
    expect(out).toContain('id="overallStatus"');
    expect(out).toContain('id="servicesGroups"');
    expect(out).toContain('id="statsGrid"');
  });

  it('contains the alert toast container', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('id="alertToastContainer"');
  });

  it('contains the alert history modal', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('id="alertHistoryModal"');
  });

  it('contains the export dialog', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('id="exportDialog"');
  });

  it('renders the footer text', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('Footer text');
  });

  it('renders header title and subtitle', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('Test Dashboard');
    expect(out).toContain('All systems operational');
  });

  it('renders footer links when provided', () => {
    const args = {
      ...baseArgs,
      uiConfig: {
        ...baseArgs.uiConfig,
        footer: {
          text: 'My footer',
          links: [{ url: 'https://example.com', text: 'Example' }],
        },
      },
    };
    const out = renderLayout(args);
    expect(out).toContain('footer-links');
    expect(out).toContain('https://example.com');
    expect(out).toContain('Example');
  });

  it('renders header links when provided', () => {
    const args = {
      ...baseArgs,
      uiConfig: {
        ...baseArgs.uiConfig,
        header: {
          ...baseArgs.uiConfig.header,
          links: [{ url: 'https://example.com', text: 'Docs', highlight: false }],
        },
      },
    };
    const out = renderLayout(args);
    expect(out).toContain('header-links');
    expect(out).toContain('https://example.com');
    expect(out).toContain('Docs');
  });

  it('does not contain <script> tags', () => {
    const out = renderLayout(baseArgs);
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('</script>');
  });

  it('renders the status banner shell and summary pills', () => {
    const out = renderLayout(baseArgs);
    expect(out).toContain('class="status-banner');
    expect(out).toContain('data-stat="up"');
    expect(out).toContain('summary-pill');
  });
});
