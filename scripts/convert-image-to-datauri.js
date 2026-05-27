#!/usr/bin/env node

/**
 * Convert an image file to a data URI for embedding in dashboard.json
 * Usage: node scripts/convert-image-to-datauri.js <image-path>
 * Example: node scripts/convert-image-to-datauri.js assets/banner_1.png
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get image path from command line
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('❌ Error: Please provide an image path');
  console.log('\nUsage: node scripts/convert-image-to-datauri.js <image-path>');
  console.log('Example: node scripts/convert-image-to-datauri.js assets/banner_1.png');
  process.exit(1);
}

const fullPath = join(projectRoot, imagePath);

try {
  // Read the image file
  const imageBuffer = readFileSync(fullPath);
  
  // Determine MIME type from file extension
  const ext = extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  
  const mimeType = mimeTypes[ext] || 'image/png';
  
  // Convert to base64
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;
  
  console.log('✅ Image converted to data URI!\n');
  console.log('📋 Copy this into your dashboard.json logoUrl field:\n');
  console.log(dataUri);
  console.log('\n💡 Tip: The data URI is quite long. Make sure to copy the entire string.');
  console.log('   It should start with "data:image/" and end with the base64 data.');
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`❌ Error: File not found: ${fullPath}`);
    console.error(`   Make sure the path is relative to the project root.`);
  } else {
    console.error(`❌ Error reading file: ${error.message}`);
  }
  process.exit(1);
}

