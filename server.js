const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const NOTION_BASE = 'api.notion.com';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Notion-Version',
    'Content-Type': 'application/json',
  };
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, corsHeaders());
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Proxy to Notion
  const parsed = url.parse(req.url);
  const options = {
    hostname: NOTION_BASE,
    path: parsed.path,
    method: req.method,
    headers: {
      'Authorization': req.headers['authorization'] || '',
      'Content-Type': 'application/json',
      'Notion-Version': req.headers['notion-version'] || '2022-06-28',
    }
  };

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const notionReq = https.request(options, (notionRes) => {
      let data = '';
      notionRes.on('data', chunk => data += chunk);
      notionRes.on('end', () => {
        res.writeHead(notionRes.statusCode, corsHeaders());
        res.end(data);
      });
    });
    notionReq.on('error', (e) => {
      res.writeHead(500, corsHeaders());
      res.end(JSON.stringify({ error: e.message }));
    });
    if (body) notionReq.write(body);
    notionReq.end();
  });
});

server.listen(PORT, () => console.log(`PAM Proxy running on port ${PORT}`));
