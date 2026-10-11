import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.gif':'image/gif', '.mp4':'video/mp4', '.txt':'text/plain; charset=utf-8' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4178');
    let path = decodeURIComponent(url.pathname);
    if (path === '/demo-popup') {
      const lang = url.searchParams.get('lang') === 'ru' ? 'ru' : 'en';
      const messages = JSON.parse(await readFile(resolve(root, `dist/_locales/${lang}/messages.json`), 'utf8'));
      const adapter = await readFile(resolve(root, 'marketing/tools/demo-adapter.js'), 'utf8');
      const html = (await readFile(resolve(root, 'dist/src/popup/index.html'), 'utf8'))
        .replace('<head>', `<head><script>window.demoMessages=${JSON.stringify(messages)};window.demoLanguage=${JSON.stringify(lang)};</script><script>${adapter}</script>`)
        .replace('src="/src/popup/index.js"', 'src="/dist/src/popup/index.js"')
        .replace('href="/index.css"', 'href="/dist/index.css"');
      res.writeHead(200, { 'Content-Type': types['.html'] }); res.end(html); return;
    }
    if (path === '/') path = '/marketing/preview.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4178, '127.0.0.1', () => console.log('Marky materials: http://127.0.0.1:4178/marketing/preview.html'));
