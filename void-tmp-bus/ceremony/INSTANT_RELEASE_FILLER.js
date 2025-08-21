#!/usr/bin/env node
// Instant release body filler - drop report.json here

const fs = require('fs');

const reportPath = process.argv[2] || 'ceremony-artifacts/report.json';
const templatePath = 'ceremony/GITHUB_RELEASE_BODY.md';

if (!fs.existsSync(reportPath)) {
  console.error(`❌ Report not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');

// Extract values with defaults
const values = {
  LOCAL_PCT: report.LOCAL_PCT || 'N/A',
  HEALTH_AVG: report.HEALTH_AVG || 'N/A',
  KOHANIST_AVG: report.KOHANIST_AVG || 'N/A',
  OFFLINE_WINDOW: report.OFFLINE_WINDOW || 'N/A',
  EVENTS_TOTAL: report.EVENTS_TOTAL || 'N/A'
};

// Fill template
let filled = template;
Object.entries(values).forEach(([key, value]) => {
  filled = filled.replace(new RegExp(`{${key}}`, 'g'), value);
});

console.log('📝 FILLED RELEASE BODY:');
console.log('======================');
console.log(filled);
console.log('======================');
console.log('\nMetrics used:');
Object.entries(values).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});