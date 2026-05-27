#!/usr/bin/env node
/**
 * migrate-monitor-data.mjs
 *
 * One-time migration script for operators deploying Task-17 (Phase 5 architecture
 * cleanup: split monitor:data into focused KV keys).
 *
 * Purpose:
 *   After deploying the updated Worker, existing KV state only has the legacy
 *   monitor:data blob. This script reads that blob and writes the new focused
 *   keys (monitor:summary and uptime:<serviceId>) so that the new readers can
 *   serve data immediately — before the next cron tick populates them.
 *
 * Usage:
 *   1. Export the current blob:
 *      npx wrangler kv key get --binding=HEARTBEAT_LOGS 'monitor:data' --remote > /tmp/data.json
 *
 *   2. Run the migration:
 *      node scripts/migrate-monitor-data.mjs /tmp/data.json
 *
 *   3. The script writes split files to ./migration-out/ and prints the
 *      wrangler commands to upload them. Copy and run those commands.
 *
 * Notes:
 *   - The script is safe to re-run: it overwrites ./migration-out/ on each run.
 *   - The legacy monitor:data key is NOT removed by this script. Removal is a
 *     follow-up task after one stable release with dual-write in place.
 *   - This script does NOT require wrangler credentials; it only reads the file
 *     you export and writes local JSON files. The actual KV upload is done by
 *     the wrangler commands it prints.
 */

import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node migrate-monitor-data.mjs <path-to-monitor-data.json>');
  process.exit(1);
}

let blob;
try {
  blob = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (err) {
  console.error(`Failed to read/parse file at ${path}: ${err.message}`);
  process.exit(1);
}

if (!blob.summary || !blob.uptime) {
  console.error('Input does not look like monitor:data — expected { summary, uptime } shape');
  process.exit(1);
}

const outDir = './migration-out';
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(`${outDir}/monitor-summary.json`, JSON.stringify(blob.summary, null, 2));
for (const [serviceId, val] of Object.entries(blob.uptime)) {
  fs.writeFileSync(`${outDir}/uptime-${serviceId}.json`, JSON.stringify(val, null, 2));
}

console.log(`Wrote migration files to ${outDir}/`);
console.log('');
console.log('To upload to KV, run:');
console.log(`  npx wrangler kv key put --binding=HEARTBEAT_LOGS --remote 'monitor:summary' --path ${outDir}/monitor-summary.json`);
for (const serviceId of Object.keys(blob.uptime)) {
  console.log(`  npx wrangler kv key put --binding=HEARTBEAT_LOGS --remote 'uptime:${serviceId}' --path ${outDir}/uptime-${serviceId}.json`);
}
