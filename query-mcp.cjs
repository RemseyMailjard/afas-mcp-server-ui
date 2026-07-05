const http = require('http');
const body = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'get-customer-data', arguments: { segment: 'All' } }
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Content-Length': Buffer.byteLength(body)
  }
}, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    // SSE response: lines starting with "data: "
    const lines = d.split('\n').filter(function(l) { return l.startsWith('data: '); });
    const jsonStr = lines.length ? lines[0].replace('data: ', '') : d;
    const parsed = JSON.parse(jsonStr);
    const text = parsed.result.content[0].text;
    const data = JSON.parse(text);

    console.log('=== MCP Tool: get-customer-data ===');
    console.log('Totaal aantal klanten:', data.customers.length);
    console.log('');
    console.log('=== Samenvatting per segment ===');

    const segs = {};
    data.customers.forEach(function(c) {
      if (!segs[c.segment]) segs[c.segment] = { n: 0, revenue: 0, nps: 0, eng: 0, employees: 0 };
      segs[c.segment].n++;
      segs[c.segment].revenue += c.annualRevenue;
      segs[c.segment].nps += c.nps;
      segs[c.segment].eng += c.engagementScore;
      segs[c.segment].employees += c.employeeCount;
    });

    // Show summary table
    const segmentOrder = ['Enterprise', 'Mid-Market', 'SMB', 'Startup'];
    segmentOrder.forEach(function(k) {
      const seg = segs[k];
      if (!seg) return;
      console.log('Segment: ' + k);
      console.log('  Aantal klanten    : ' + seg.n);
      console.log('  Gem. jaaromzet    : € ' + Math.round(seg.revenue / seg.n).toLocaleString('nl-NL'));
      console.log('  Gem. medewerkers  : ' + Math.round(seg.employees / seg.n));
      console.log('  Gem. NPS          : ' + Math.round(seg.nps / seg.n));
      console.log('  Gem. engagement   : ' + Math.round(seg.eng / seg.n) + '/100');
      console.log('');
    });
  });
});

req.write(body);
req.end();
