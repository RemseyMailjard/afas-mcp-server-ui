const http = require('http');
const body = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'tools/call',
  params: { name: 'get-customer-data', arguments: { segment: 'All' } }
});
const req = http.request({
  hostname: 'localhost', port: 3001, path: '/mcp', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(body) }
}, function(res) {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const lines = d.split('\n').filter(l => l.startsWith('data: '));
    const json = JSON.parse(lines[0].replace('data: ', ''));
    const customers = JSON.parse(json.result.content[0].text).customers;

    // Filter: ≤100 employees
    const filtered = customers.filter(c => c.employeeCount <= 100)
      .sort((a, b) => a.employeeCount - b.employeeCount);

    console.log(`Klanten met ≤100 medewerkers: ${filtered.length}`);
    console.log('');
    console.log('Nr  | Naam                          | Segment  | Medewerkers | Annual Revenue');
    console.log('----|-------------------------------|----------|-------------|----------------');
    filtered.forEach((c, i) => {
      const rev = '€ ' + Math.round(c.annualRevenue).toLocaleString('nl-NL');
      const name = c.name.padEnd(29);
      const seg = c.segment.padEnd(8);
      const emp = String(c.employeeCount).padStart(11);
      console.log(`${String(i+1).padStart(3)} | ${name} | ${seg} | ${emp} | ${rev}`);
    });

    // Summary per segment
    console.log('');
    const segs = {};
    filtered.forEach(c => {
      if (!segs[c.segment]) segs[c.segment] = { n: 0, revenue: 0 };
      segs[c.segment].n++;
      segs[c.segment].revenue += c.annualRevenue;
    });
    console.log('Samenvatting:');
    Object.entries(segs).forEach(([k, v]) => {
      console.log(`  ${k}: ${v.n} klanten, totale omzet € ${Math.round(v.revenue).toLocaleString('nl-NL')}, gem. € ${Math.round(v.revenue/v.n).toLocaleString('nl-NL')}`);
    });
    const totalRev = filtered.reduce((s, c) => s + c.annualRevenue, 0);
    console.log(`  Totaal: ${filtered.length} klanten, € ${Math.round(totalRev).toLocaleString('nl-NL')}`);
  });
});
req.write(body); req.end();
