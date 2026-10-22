import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { issuesFor, parseDraft } from '../public/studio-model.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const COOKIE = 'memory_arcade_admin';
const CONTENT_LIMIT = 32 * 1024 * 1024;
const LOGIN_WINDOW = 15 * 60 * 1000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const digest = value => createHash('sha256').update(value).digest();

export function normalizeBasePath(value = '/') {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) throw new Error('BASE_PATH 必须为 / 或以 / 结尾的路径，例如 /memory-arcade/。');
  return value;
}
function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}
function readBody(req, limit) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw fail(415, '请使用 JSON 请求。');
  if (Number(req.headers['content-length']) > limit) { req.resume(); throw fail(413, '请求内容过大。'); }
  return new Promise((resolveBody, reject) => {
    let length = 0, rejected = false;
    const chunks = [];
    req.on('data', chunk => {
      if (rejected) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.length;
      if (length > limit) { rejected = true; chunks.length = 0; reject(fail(413, '请求内容过大。')); return; }
      chunks.push(bytes);
    });
    req.on('end', () => { if (!rejected) resolveBody(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', () => reject(fail(400, '请求读取失败，请重试。')));
    req.on('aborted', () => reject(fail(400, '请求已中断。')));
  });
}
function requireSameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host || origin.origin !== req.headers.origin) throw new Error();
  } catch { throw fail(403, '仅允许从本站修改配置。'); }
}
function validatedContent(raw) {
  let content;
  try { content = parseDraft(raw); } catch (error) { throw fail(422, error.message); }
  const issues = issuesFor(content);
  if (issues.length) throw fail(422, `请先补全内容：${issues[0].label}。`);
  return content;
}

export function createAdminMiddleware({ basePath = '/', configPath = resolve(ROOT, 'config/admin.json'), dataPath = resolve(ROOT, '.data/content.json'), sessionTtlMs = 8 * 60 * 60 * 1000, now = Date.now, onError = () => {} } = {}) {
  const base = normalizeBasePath(basePath);
  const { adminKey } = JSON.parse(readFileSync(configPath, 'utf8'));
  if (typeof adminKey !== 'string' || !adminKey.trim() || adminKey.length > 256) throw new Error('config/admin.json 中的 adminKey 必须为 1–256 个非空白字符。');
  const keyDigest = digest(adminKey);
  // shortcut: sessions are process-local; use a shared session store before running multiple server instances.
  const sessions = new Map();
  const failedLogins = new Map();
  const tokenFrom = req => (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const authenticated = req => {
    const time = now();
    for (const [token, expires] of sessions) if (expires <= time) sessions.delete(token);
    return sessions.has(tokenFrom(req));
  };
  const setCookie = (req, res, token, age) => {
    const secure = req.socket?.encrypted || req.headers.origin?.startsWith('https://');
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=${base}; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`);
  };
  return async function adminMiddleware(req, res, next = () => json(res, 404, { error: '未找到页面。' })) {
    const pathname = (req.url || '').split('?')[0];
    if (!pathname.startsWith(`${base}api/`)) return next();
    const route = pathname.slice(base.length);
    try {
      if (route !== 'api/content' && route !== 'api/admin/session') { json(res, 404, { error: '未找到接口。' }); return; }
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) throw fail(405, '不支持的请求方式。');
      if (req.method !== 'GET') requireSameOrigin(req);
      if (route === 'api/admin/session') {
        if (req.method === 'GET') { json(res, 200, { authenticated: authenticated(req) }); return; }
        if (req.method === 'DELETE') {
          sessions.delete(tokenFrom(req)); setCookie(req, res, '', 0);
          json(res, 200, { authenticated: false }); return;
        }
        if (req.method !== 'POST') throw fail(405, '不支持的请求方式。');
        const ip = req.socket?.remoteAddress || 'unknown';
        const time = now();
        for (const [address, attempt] of failedLogins) if (attempt.until <= time) failedLogins.delete(address);
        if ((failedLogins.get(ip)?.count || 0) >= 5) {
          res.setHeader('Retry-After', String(Math.ceil((failedLogins.get(ip).until - time) / 1000)));
          throw fail(429, '尝试次数过多，请 15 分钟后再试。');
        }
        let body;
        try { body = JSON.parse(await readBody(req, 1024)); } catch (error) { if (error.status) throw error; throw fail(400, '请求不是有效的 JSON。'); }
        if (!body || typeof body.key !== 'string' || body.key.length > 256 || !timingSafeEqual(digest(body.key), keyDigest)) {
          const attempt = failedLogins.get(ip) || { count: 0, until: time + LOGIN_WINDOW };
          attempt.count += 1; failedLogins.set(ip, attempt);
          if (failedLogins.size > 1000) failedLogins.delete(failedLogins.keys().next().value);
          throw fail(401, '管理密钥不正确。');
        }
        failedLogins.delete(ip);
        authenticated(req);
        sessions.delete(tokenFrom(req));
        const token = randomBytes(32).toString('hex');
        sessions.set(token, time + sessionTtlMs);
        setCookie(req, res, token, Math.floor(sessionTtlMs / 1000));
        json(res, 200, { authenticated: true }); return;
      }
      if (req.method === 'GET') {
        let raw;
        try { raw = await readFile(dataPath, 'utf8'); }
        catch (error) { if (error.code === 'ENOENT') { json(res, 200, { content: null }); return; } throw error; }
        try { json(res, 200, { content: validatedContent(raw) }); }
        catch { throw fail(500, '无法读取已发布内容，请联系管理员检查内容文件。'); }
        return;
      }
      if (req.method !== 'PUT') throw fail(405, '不支持的请求方式。');
      if (!authenticated(req)) throw fail(401, '请先登录管理员入口。');
      const content = validatedContent(await readBody(req, CONTENT_LIMIT));
      await mkdir(dirname(dataPath), { recursive: true, mode: 0o700 });
      const temporary = `${dataPath}.${randomBytes(12).toString('hex')}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(content, null, 2), { flag: 'wx', mode: 0o600 });
        await rename(temporary, dataPath);
      } finally { await rm(temporary, { force: true }); }
      json(res, 200, { content });
    } catch (error) {
      if (!error.status || error.status >= 500) onError(error);
      json(res, error.status || 500, { error: error.status ? error.message : '内容服务暂时不可用，请稍后重试。' });
    }
  };
}
