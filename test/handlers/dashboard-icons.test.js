import { describe, it, expect } from 'vitest';
import { ICON_SYMBOLS, icon } from '../../src/handlers/dashboard/icons.js';

const EXPECTED_IDS = [
  'icon-clipboard-list','icon-alert-octagon','icon-alert-triangle','icon-info',
  'icon-activity','icon-radio','icon-inbox','icon-download','icon-bell',
  'icon-refresh-cw','icon-moon','icon-sun','icon-check','icon-x',
  'icon-clock','icon-chevron-down','icon-menu','icon-external-link',
];

describe('icon registry', () => {
  it('starts with a hidden svg', () => {
    expect(ICON_SYMBOLS.trim().startsWith('<svg')).toBe(true);
    expect(ICON_SYMBOLS).toContain('display:none');
    expect(ICON_SYMBOLS).toContain('aria-hidden="true"');
  });
  it.each(EXPECTED_IDS)('includes %s', (id) => {
    expect(ICON_SYMBOLS).toContain(`id="${id}"`);
  });
  it.each(EXPECTED_IDS)('%s has non-empty path data', (id) => {
    const re = new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)<\\/symbol>`);
    const match = ICON_SYMBOLS.match(re);
    expect(match).not.toBeNull();
    expect(match[1].trim().length).toBeGreaterThan(20);
  });
  describe('icon() helper', () => {
    it('returns a <use> reference', () => {
      expect(icon('bell')).toContain('href="#icon-bell"');
      expect(icon('bell')).toContain('class="icon');
    });
    it('appends extra class when provided', () => {
      expect(icon('moon', 'icon--lg')).toContain('icon icon--lg');
    });
    it('does NOT escape — assumes name is internal', () => {
      // intentional: helper does not sanitise. Note in code comment.
      expect(icon('bell').endsWith('</svg>')).toBe(true);
    });
  });
});
