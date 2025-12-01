/**
 * Simple test server to receive webhook calls for testing
 * Run with: node test-webhook-server.js
 */

const http = require('http');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const endpoint = parsedUrl.pathname;

  if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        console.log(`\n🔗 Webhook received at ${endpoint}`);
        console.log('📊 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📦 Data:', JSON.stringify(data, null, 2));

        // Respond with success
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          endpoint: endpoint,
          dataType: data.type || 'unknown',
          receivedAt: new Date().toISOString(),
          message: `Successfully received ${data.type || 'unknown'} data`
        }));

      } catch (error) {
        console.error('❌ Error parsing webhook data:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON data',
          receivedAt: new Date().toISOString()
        }));
      }
    });

  } else if (req.method === 'GET' && endpoint === '/') {
    // Simple status page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Tella Webhook Test Server</title></head>
        <body>
          <h1>🔗 Tella Webhook Test Server</h1>
          <p>Server is running on port ${PORT}</p>
          <p>Ready to receive webhooks at:</p>
          <ul>
            <li><strong>Document endpoint:</strong> <code>http://localhost:${PORT}/document</code></li>
            <li><strong>Transcription endpoint:</strong> <code>http://localhost:${PORT}/transcription</code></li>
          </ul>
          <p>Configure your Tella extension with base URL: <code>http://localhost:${PORT}</code></p>
        </body>
      </html>
    `);

  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/document', '/transcription']
    }));
  }
});

server.listen(PORT, () => {
  console.log('🚀 Tella Webhook Test Server started');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('📡 Ready to receive webhooks at:');
  console.log(`   • Document: http://localhost:${PORT}/document`);
  console.log(`   • Transcription: http://localhost:${PORT}/transcription`);
  console.log('\n💡 Configure your extension with base URL: http://localhost:' + PORT);
  console.log('🔍 Visit http://localhost:' + PORT + ' for status\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
  } else {
    console.error('❌ Server error:', error);
  }
});