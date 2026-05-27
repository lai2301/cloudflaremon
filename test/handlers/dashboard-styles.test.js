import { describe, it, expect } from 'vitest';
import { renderStyles } from '../../src/handlers/dashboard/styles.js';

const defaults = {
  theme: {
    colors: {
      light: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        text: '#111827',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        statusUp: '#10b981',
        statusDown: '#ef4444',
        statusDegraded: '#f59e0b',
      },
      dark: {
        primary: '#1f2937',
        secondary: '#111827',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        statusUp: '#10b981',
        statusDown: '#ef4444',
        statusDegraded: '#f59e0b',
      },
    },
  },
  branding: { primaryColor: '#3b82f6', accentColor: '#10b981' },
  uptimeThresholds: {
    default: [
      { name: 'excellent', min: 99.5, color: '#10b981', label: 'Excellent' },
      { name: 'good', min: 99.0, color: '#3b82f6', label: 'Good' },
      { name: 'fair', min: 95.0, color: '#f59e0b', label: 'Fair' },
      { name: 'poor', min: 0, color: '#ef4444', label: 'Poor' },
    ],
  },
  customCss: '',
};

describe('renderStyles', () => {
  it('wraps output in <style> tags', () => {
    const out = renderStyles(defaults);
    expect(out.trim().startsWith('<style>')).toBe(true);
    expect(out.trim().endsWith('</style>')).toBe(true);
  });
  it('contains key custom properties', () => {
    const out = renderStyles(defaults);
    expect(out).toContain('--bg-primary');
    expect(out).toContain('--text-primary');
    expect(out).toContain('--status-up');
  });
  it('interpolates light theme primary background', () => {
    const out = renderStyles(defaults);
    expect(out).toContain('#ffffff');
  });
  it('interpolates uptimeThresholds CSS classes', () => {
    const out = renderStyles(defaults);
    expect(out).toContain('.service-uptime.uptime-excellent');
  });
  it('includes customCss section', () => {
    const withCss = { ...defaults, customCss: '.custom { color: red; }' };
    const out = renderStyles(withCss);
    expect(out).toContain('.custom { color: red; }');
  });
});
