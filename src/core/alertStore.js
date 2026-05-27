/**
 * Shared alert persistence helpers.
 *
 * Owns the read-merge-write cycle for recent:alerts in KV.
 * Alert shape construction is left to each call site.
 */

import notificationsConfig from '../../config/notifications.json' assert { type: 'json' };

const KV_KEY = 'recent:alerts';
const DEFAULT_MAX_ALERTS = 100;
const DEFAULT_MAX_AGE_DAYS = 7;

function getHistoryConfig() {
  return notificationsConfig?.settings?.alertHistory || {};
}

/**
 * Trim alerts to the configured cap, keeping the newest entries (assumed
 * to be at the front of the array because callers unshift).
 *
 * @param {Array} alerts
 * @param {number} [max] - Maximum number of entries to keep. Defaults to the
 *   configured cap from notifications.json (settings.alertHistory.maxAlerts).
 */
export function cleanupAlerts(alerts, max) {
  if (!Array.isArray(alerts)) return [];
  const cap = (typeof max === 'number') ? max : (getHistoryConfig().maxAlerts ?? DEFAULT_MAX_ALERTS);
  if (alerts.length <= cap) return alerts;
  return alerts.slice(0, cap);
}

/**
 * Append an alert to recent:alerts. Reads, prepends, trims, writes back.
 *
 * Applies age-based and count-based cleanup when cleanupOnAdd is not
 * explicitly set to false in notifications.json settings.alertHistory.
 *
 * No CAS — concurrent writers can lose entries. Acceptable for the
 * cron-driven and externally-driven alert paths because they don't
 * collide in practice.
 *
 * @param {object} env - Cloudflare Worker environment bindings.
 * @param {object} alert - The alert object to prepend.
 */
export async function appendAlert(env, alert) {
  if (!env?.HEARTBEAT_LOGS) return;
  try {
    const raw = await env.HEARTBEAT_LOGS.get(KV_KEY);
    let list = raw ? JSON.parse(raw) : [];

    list.unshift(alert);

    const historyConfig = getHistoryConfig();

    if (historyConfig.cleanupOnAdd !== false) {
      const maxAlerts = historyConfig.maxAlerts ?? DEFAULT_MAX_ALERTS;
      const maxAgeDays = historyConfig.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      // Remove alerts older than maxAgeDays
      list = list.filter(a => {
        const t = new Date(a.timestamp).getTime();
        return (now - t) < maxAgeMs;
      });

      // Trim to count cap
      list = cleanupAlerts(list, maxAlerts);
    }

    await env.HEARTBEAT_LOGS.put(KV_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('alertStore.appendAlert failed:', error);
  }
}
