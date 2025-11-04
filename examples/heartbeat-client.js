#!/usr/bin/env node

/**
 * Cloudflare Worker Heartbeat Client (Node.js)
 * This script sends a heartbeat to the Cloudflare Worker
 * Run this periodically using cron, systemd timer, or a scheduler
 */

const https = require('https');
const os = require('os');

// Configuration
const WORKER_URL = 'https://heartbeat-monitor.your-subdomain.workers.dev/api/heartbeat';
const SERVICE_ID = 'service-1';
const API_KEY = 'your-secret-key-1';

/**
 * Send heartbeat to Cloudflare Worker
 */
async function sendHeartbeat() {
  // Gather metadata
  const hostname = os.hostname();
  const timestamp = new Date().toISOString();
  
  // Build payload
  const payload = JSON.stringify({
    serviceId: SERVICE_ID,
    status: 'up',
    metadata: {
      hostname: hostname,
      timestamp: timestamp,
      platform: os.platform(),
      arch: os.arch(),
    },
    message: `Heartbeat from ${hostname}`
  });
  
  // Parse URL
  const url = new URL(WORKER_URL);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': `Bearer ${API_KEY}`
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${new Date().toISOString()}] Heartbeat sent successfully:`, data);
          resolve(0);
        } else {
          console.error(`[${new Date().toISOString()}] Failed to send heartbeat: ${res.statusCode} - ${data}`);
          resolve(1);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] Error sending heartbeat:`, error.message);
      resolve(1);
    });
    
    req.write(payload);
    req.end();
  });
}

// Run
sendHeartbeat().then(code => process.exit(code));

