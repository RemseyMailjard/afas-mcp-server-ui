const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, 'node_modules/@modelcontextprotocol/ext-apps/dist/src/app-bridge.js'),
  'utf8'
);

// Find initialize handling on the host side
const idx = src.indexOf('ui/initialize');
console.log('host ui/initialize context:');
console.log(src.substring(idx - 50, idx + 800));
