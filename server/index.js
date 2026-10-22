import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminMiddleware, normalizeBasePath } from './admin.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function text(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(value);
}
export function createStaticHandler({ distPath = resolve(ROOT, 'dist'), basePath = '/' } = {}) {
  const root = resolve(distPath);
  const base = normalizeBasePath(basePath);
  return async function serveStatic(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) { text(res, 405, 'Method not allowed'); return; }
    let pathname;
    try { pathname = decodeURIComponent((req.url || '').split('?')[0]); }
    catch { text(res, 404, 'Not found'); return; }
    if (base !== '/' && pathname === base.slice(0, -1)) { res.statusCode = 302; res.setHeader('Location', base); res.end(); return; }
    if (!pathname.startsWith(base) || pathname.includes('\\') || pathname.includes('\0')) { text(res, 404, 'Not found'); return; }
    const relative = pathname.slice(base.length) || 'index.html';
    if (relative.split('/').some(segment => segment.startsWith('.'))) { text(res, 404, 'Not found'); return; }
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) { text(res, 404, 'Not found'); return; }
    try {
      const [actualRoot, actualFile, info] = await Promise.all([realpath(root), realpath(file), stat(file)]);
      if (!actualFile.startsWith(actualRoot + sep) || !info.isFile()) { text(res, 404, 'Not found'); return; }
      const body = req.method === 'HEAD' ? undefined : await readFile(file);
      res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', relative.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.setHeader('Content-Length', body?.length ?? info.size);
      res.end(body);
    } catch (error) {
      text(res, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, error.code === 'ENOENT' ? 'Not found. Run npm run build before starting the server.' : 'Unable to serve file');
    }
  };
}
export function createAppServer(options = {}) {
  const api = createAdminMiddleware(options);
  const serveStatic = createStaticHandler(options);
  return createServer((req, res) => {
    Promise.resolve(api(req, res, () => serveStatic(req, res))).catch(() => {
      if (!res.writableEnded) text(res, 500, 'Server unavailable');
    });
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须为 1–65535。');
  const basePath = normalizeBasePath(process.env.BASE_PATH || '/');
  const server = createAppServer({ basePath });
  server.listen(port, process.env.HOST || '0.0.0.0', () => {
    console.log(`Memory Arcade: http://localhost:${port}${basePath}`);
    console.log(`Admin studio: http://localhost:${port}${basePath}studio.html`);
  });
  server.on('error', error => { console.error(`Server failed: ${error.code || 'unknown error'}`); process.exitCode = 1; });
}
