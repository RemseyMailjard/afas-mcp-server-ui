const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, 'node_modules/@modelcontextprotocol/ext-apps/dist/src/app.js'),
  'utf8'
);

// Find protocolVersion
const versionMatches = [...src.matchAll(/SUPPORTED_PROTOCOL_VERSIONS\s*=\s*\[([^\]]+)\]/g)];
versionMatches.forEach(m => console.log('SUPPORTED_PROTOCOL_VERSIONS:', m[1]));

// Also look for any hardcoded version strings
const v = [...src.matchAll(/"(2\d\d\d-\d\d-\d\d)"/g)];
if (v.length) console.log('Date strings:', [...new Set(v.map(m => m[1]))].join(', '));

// Find the initialize request schema
const initIdx = src.indexOf('ui/initialize');
if (initIdx >= 0) {
  console.log('\nui/initialize context:');
  console.log(src.substring(initIdx - 100, initIdx + 300));
}
