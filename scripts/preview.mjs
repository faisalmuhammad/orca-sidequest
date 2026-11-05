import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../panel/', import.meta.url));
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root)) { response.writeHead(403).end(); return; }
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': `${mime[path.extname(target)] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' }).end(data);
  } catch { response.writeHead(404).end(); }
});
server.listen(Number(process.env.SIDEQUEST_PREVIEW_PORT ?? 4318), '127.0.0.1', () => {
  console.log(`Sidequest preview: http://127.0.0.1:${server.address().port}`);
});
