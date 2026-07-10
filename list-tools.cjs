const http = require('http');
const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
const req = http.request({
  hostname: 'localhost', port: 3001, path: '/mcp', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(body) }
}, function(res) {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const lines = d.split('\n').filter(l => l.startsWith('data: '));
    const json = JSON.parse(lines[0].replace('data: ', ''));
    console.log('=== Geregistreerde MCP tools ===');
    json.result.tools.forEach(t => console.log(' -', t.name, '|', t.description?.slice(0, 60) + '...'));
  });
});
req.write(body); req.end();
