// Configuration
import { getUiConfig, buildServicesWithGroups } from '../../config/loader.js';
import { renderStyles } from './styles.js';
import { renderScripts } from './scripts.js';
import { renderLayout } from './layout.js';

const uiConfig = getUiConfig();
const processedServices = buildServicesWithGroups();

export async function handleDashboard(env) {
  // Fetch monitor data from separate KV keys to avoid race conditions
  const [latestJson, dataJson] = await Promise.all([
    env.HEARTBEAT_LOGS.get('monitor:latest'),
    env.HEARTBEAT_LOGS.get('monitor:data')
  ]);

  // Merge latest timestamps with summary/uptime data
  const monitorData = {
    latest: latestJson ? JSON.parse(latestJson) : {},
    ...(dataJson ? JSON.parse(dataJson) : { uptime: {}, summary: null })
  };

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>${uiConfig.branding.pageTitle}</title>
    <link rel="icon" href="${uiConfig.branding.favicon}">
    ${renderStyles(uiConfig)}
</head>
<body>
  ${renderLayout({ uiConfig, processedServices, monitorData })}
  ${renderScripts({ uiConfig, processedServices, monitorData })}
</body>
</html>`, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'Vary': 'Accept-Encoding'
    }
  });
}
