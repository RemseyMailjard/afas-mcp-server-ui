/**
 * Minimal test host server for the mcp-app.html UI.
 * Serves the app at /app and a test-harness host page at /test.
 * The harness simulates the MCP ext-apps host protocol via postMessage
 * and proxies tools/call requests to the MCP server at localhost:3001.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_PORT = 3001;
const TEST_PORT = 3002;
const DIST_DIR = path.join(__dirname, 'dist');

// The test harness HTML - acts as an MCP App host
const harnessHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>MCP App Test Host</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f0f2f5; }
    header {
      background: #1e293b; color: #fff;
      padding: 12px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    header h1 { font-size: 16px; font-weight: 600; }
    .badge {
      background: #10b981; color: #fff;
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
    }
    #status {
      font-size: 12px; color: #94a3b8; margin-left: auto;
    }
    #status.ok { color: #10b981; }
    #status.err { color: #f87171; }
    #app-frame {
      width: 100%; height: calc(100vh - 48px);
      border: none; display: block;
      background: #fff;
    }
  </style>
</head>
<body>
  <header>
    <h1>Customer Segmentation Explorer</h1>
    <span class="badge">MCP App</span>
    <span id="status">Verbinden...</span>
  </header>
  <iframe id="app-frame" src="/app" sandbox="allow-scripts allow-same-origin"></iframe>

  <script>
    const statusEl = document.getElementById('status');
    const iframe = document.getElementById('app-frame');
    let iframeReady = false;
    let pendingRequests = {};

    // Call the real MCP server
    async function callMcpTool(name, args) {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args }
      });
      const resp = await fetch('http://localhost:${MCP_PORT}/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body
      });
      const text = await resp.text();
      // Parse SSE or direct JSON
      const lines = text.split('\\n').filter(l => l.startsWith('data: '));
      const jsonStr = lines.length ? lines[0].replace('data: ', '') : text;
      const parsed = JSON.parse(jsonStr);
      return parsed.result;
    }

    // Send a JSON-RPC message to the iframe app
    function sendToApp(message) {
      iframe.contentWindow.postMessage(message, '*');
    }

    // Handle messages from the iframe app
    window.addEventListener('message', async (event) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      console.log('[HOST] Received from app:', msg.method || ('response id=' + msg.id));

      // JSON-RPC request (has id + method)
      if (msg.id !== undefined && msg.method) {
        if (msg.method === 'ui/initialize') {
          // Respond to initialize handshake
          statusEl.textContent = 'Initialiseren...';
          sendToApp({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              protocolVersion: msg.params?.protocolVersion || '2026-01-26',
              hostInfo: { name: 'MCP Test Host', version: '1.0.0' },
              hostCapabilities: { serverTools: {} },
              hostContext: { theme: 'light' }
            }
          });
        } else if (msg.method === 'tools/call') {
          // Forward to real MCP server
          const { name, arguments: args } = msg.params;
          statusEl.textContent = 'Data ophalen...';
          try {
            const result = await callMcpTool(name, args || {});
            sendToApp({ jsonrpc: '2.0', id: msg.id, result });
            statusEl.textContent = 'Verbonden - ' + new Date().toLocaleTimeString('nl-NL');
            statusEl.className = 'ok';
          } catch (err) {
            console.error('[HOST] Tool call failed:', err);
            statusEl.textContent = 'Fout: ' + err.message;
            statusEl.className = 'err';
            sendToApp({
              jsonrpc: '2.0', id: msg.id,
              error: { code: -32000, message: err.message }
            });
          }
        } else if (msg.method === 'ping') {
          sendToApp({ jsonrpc: '2.0', id: msg.id, result: {} });
        } else {
          // Unknown request - return method not found
          sendToApp({
            jsonrpc: '2.0', id: msg.id,
            error: { code: -32601, message: 'Method not found: ' + msg.method }
          });
        }
      }
      // Notification (method, no id)
      else if (msg.method && msg.id === undefined) {
        if (msg.method === 'ui/notifications/initialized') {
          iframeReady = true;
          statusEl.textContent = 'App geladen, data ophalen...';
        }
        // Other notifications: log only
      }
    });
  </script>
</body>
</html>`;

// The test harness HTML for the AFAS verlof app
const verlofHarnessHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>AFAS Verlofsaldo – Test Host</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; }
    #app-frame { width: 100%; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <iframe id="app-frame" src="/verlof" sandbox="allow-scripts allow-same-origin"></iframe>
  <script>
    const iframe = document.getElementById('app-frame');

    async function callMcpTool(name, args) {
      const body = JSON.stringify({
        jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
        params: { name, arguments: args }
      });
      const resp = await fetch('http://localhost:${MCP_PORT}/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
        body
      });
      const text = await resp.text();
      const lines = text.split('\\n').filter(l => l.startsWith('data: '));
      return JSON.parse(lines.length ? lines[0].replace('data: ', '') : text).result;
    }

    window.addEventListener('message', async (event) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.id !== undefined && msg.method) {
        if (msg.method === 'ui/initialize') {
          iframe.contentWindow.postMessage({
            jsonrpc: '2.0', id: msg.id,
            result: {
              protocolVersion: msg.params?.protocolVersion || '2026-01-26',
              hostInfo: { name: 'AFAS Test Host', version: '1.0.0' },
              hostCapabilities: { serverTools: {} },
              hostContext: { theme: 'light' }
            }
          }, '*');
        } else if (msg.method === 'tools/call') {
          const { name, arguments: args } = msg.params;
          try {
            const result = await callMcpTool(name, args || {});
            iframe.contentWindow.postMessage({ jsonrpc: '2.0', id: msg.id, result }, '*');
          } catch (err) {
            iframe.contentWindow.postMessage({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: err.message } }, '*');
          }
        } else if (msg.method === 'ping') {
          iframe.contentWindow.postMessage({ jsonrpc: '2.0', id: msg.id, result: {} }, '*');
        } else {
          iframe.contentWindow.postMessage({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } }, '*');
        }
      }
    });
  </script>
</body>
</html>`;

// Generic harness factory (re-used for verlofkaart)
function makeHarness(appPath, toolName, pageTitle) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>${pageTitle} – Test Host</title>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#eef0f2;}#app-frame{width:100%;height:100vh;border:none;display:block;}</style>
  </head><body><iframe id="app-frame" src="${appPath}" sandbox="allow-scripts allow-same-origin"></iframe>
  <script>
    const iframe=document.getElementById('app-frame');
    async function callMcp(name,args){
      const body=JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'tools/call',params:{name,arguments:args}});
      const r=await fetch('http://localhost:${MCP_PORT}/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body});
      const t=await r.text();
      const lines=t.split('\\n').filter(l=>l.startsWith('data: '));
      return JSON.parse(lines.length?lines[0].replace('data: ',''):t).result;
    }
    window.addEventListener('message',async(e)=>{
      if(e.source!==iframe.contentWindow)return;
      const m=e.data;
      if(!m||typeof m!=='object')return;
      if(m.id!==undefined&&m.method){
        if(m.method==='ui/initialize'){
          iframe.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{protocolVersion:m.params?.protocolVersion||'2026-01-26',hostInfo:{name:'Test Host',version:'1.0.0'},hostCapabilities:{serverTools:{}},hostContext:{theme:'light'}}},'*');
        }else if(m.method==='tools/call'){
          try{const r=await callMcp(m.params.name,m.params.arguments||{});iframe.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:r},'*');}
          catch(err){iframe.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,error:{code:-32000,message:err.message}},'*');}
        }else if(m.method==='ping'){iframe.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*');
        }else{iframe.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}},'*');}
      }
    });
  </script></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url ? req.url.split('?')[0] : '/';

  const staticFiles = {
    '/app':     path.join(DIST_DIR, 'mcp-app.html'),
    '/verlof':  path.join(DIST_DIR, 'afas-verlof.html'),
    '/kaart':   path.join(DIST_DIR, 'verlofkaart.html'),
  };

  if (staticFiles[url]) {
    fs.readFile(staticFiles[url], (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (url === '/' || url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(harnessHtml);
  } else if (url === '/test-verlof') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(verlofHarnessHtml);
  } else if (url === '/test-kaart') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(makeHarness('/kaart', 'get-verlofkaart', 'AFAS Verlofkaart'));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(TEST_PORT, () => {
  console.log('Test harness running at http://localhost:' + TEST_PORT);
  console.log('  Klantoverzicht:  http://localhost:' + TEST_PORT + '/test');
  console.log('  Verlofsaldo:     http://localhost:' + TEST_PORT + '/test-verlof');
  console.log('  Verlofkaart:     http://localhost:' + TEST_PORT + '/test-kaart');
});
