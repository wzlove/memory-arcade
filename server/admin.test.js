import { Readable } from 'node:stream';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleDraft } from '../public/studio-model.js';
import { createAdminMiddleware } from './admin.js';

async function request(handler, method, url, body, { cookie, origin = 'http://localhost:5173', ip = '127.0.0.1', raw } = {}) {
  const text = raw ?? (body === undefined ? '' : JSON.stringify(body));
  const req = Readable.from(text ? [Buffer.from(text)] : []);
  Object.assign(req, { method, url, headers: { host: 'localhost:5173', origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, socket: { remoteAddress: ip } });
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(value = '') { this.body = String(value); this.writableEnded = true; } };
  let next = false;
  await handler(req, res, () => { next = true; });
  return { status: res.statusCode, headers: res.headers, body: res.body ? JSON.parse(res.body) : null, next };
}
let directory, configPath, dataPath, handler, clock;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'memory-arcade-admin-'));
  configPath = join(directory, 'admin.json'); dataPath = join(directory, 'data', 'content.json');
  await writeFile(configPath, JSON.stringify({ adminKey: 'whoops2026' }));
  clock = 1000;
  handler = createAdminMiddleware({ configPath, dataPath, now: () => clock, sessionTtlMs: 10000 });
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
async function login(current = handler, url = '/api/admin/session') {
  const response = await request(current, 'POST', url, { key: 'whoops2026' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'].split(';')[0];
}

describe('server-side admin content', () => {
  it('requires the configured key and a session for publication', async () => {
    expect((await request(handler, 'GET', '/api/content')).body).toEqual({ content: null });
    expect((await request(handler, 'GET', '/api/admin/session')).body).toEqual({ authenticated: false });
    expect((await request(handler, 'POST', '/api/admin/session', { key: 'wrong' })).status).toBe(401);
    expect((await request(handler, 'PUT', '/api/content', sampleDraft())).status).toBe(401);
    const cookie = await login();
    expect((await request(handler, 'GET', '/api/admin/session', undefined, { cookie })).body.authenticated).toBe(true);
  });
  it('persists complete content across middleware restarts and never overwrites it with invalid input', async () => {
    const cookie = await login(); const content = sampleDraft();
    expect((await request(handler, 'PUT', '/api/content', content, { cookie })).body).toEqual({ content });
    const bad = sampleDraft(); bad.memories[2].body = '';
    expect((await request(handler, 'PUT', '/api/content', bad, { cookie })).status).toBe(422);
    const fresh = createAdminMiddleware({ configPath, dataPath });
    expect((await request(fresh, 'GET', '/api/content')).body).toEqual({ content });
    expect(JSON.parse(await readFile(dataPath, 'utf8'))).toEqual(content);
    expect((await request(fresh, 'PUT', '/api/content', content, { cookie })).status).toBe(401);
  });
  it('clears sessions on logout and expiration', async () => {
    const cookie = await login();
    const loggedOut = await request(handler, 'DELETE', '/api/admin/session', undefined, { cookie });
    expect(loggedOut.headers['set-cookie']).toContain('Max-Age=0');
    expect((await request(handler, 'PUT', '/api/content', sampleDraft(), { cookie })).status).toBe(401);
    const otherCookie = await login(); clock += 10001;
    expect((await request(handler, 'GET', '/api/admin/session', undefined, { cookie: otherCookie })).body.authenticated).toBe(false);
  });
  it('rejects cross-origin writes, malformed bodies and requests beyond the size limit', async () => {
    const cookie = await login();
    expect((await request(handler, 'PUT', '/api/content', sampleDraft(), { cookie, origin: 'https://evil.example' })).status).toBe(403);
    expect((await request(handler, 'POST', '/api/admin/session', undefined, { raw: '{' })).status).toBe(400);
    expect((await request(handler, 'POST', '/api/admin/session', undefined, { raw: 'a'.repeat(1025) })).status).toBe(413);
  });
  it('sets a protected path-scoped cookie and handles base paths without swallowing static requests', async () => {
    const prefixed = createAdminMiddleware({ configPath, dataPath, basePath: '/memory-arcade/' });
    const response = await request(prefixed, 'POST', '/memory-arcade/api/admin/session', { key: 'whoops2026' }, { origin: 'https://localhost:5173' });
    expect(response.headers['set-cookie']).toContain('Path=/memory-arcade/');
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Strict');
    expect(response.headers['set-cookie']).toContain('Secure');
    expect(response.headers['cache-control']).toBe('no-store');
    expect((await request(prefixed, 'GET', '/memory-arcade/studio.html')).next).toBe(true);
    expect((await request(prefixed, 'GET', '/memory-arcade/api/unknown')).status).toBe(404);
  });
  it('rate limits failed login attempts and reports corrupt published data', async () => {
    for (let i = 0; i < 5; i++) expect((await request(handler, 'POST', '/api/admin/session', { key: 'wrong' })).status).toBe(401);
    expect((await request(handler, 'POST', '/api/admin/session', { key: 'whoops2026' })).status).toBe(429);
    clock += 15 * 60 * 1000;
    const cookie = await login();
    await request(handler, 'PUT', '/api/content', sampleDraft(), { cookie });
    await writeFile(dataPath, '{broken');
    const corrupted = await request(handler, 'GET', '/api/content');
    expect(corrupted.status).toBe(500);
    expect(corrupted.body.error).toContain('无法读取');
  });
  it('rejects empty or whitespace-only keys and treats malformed cookies as unauthenticated', async () => {
    for (const adminKey of ['', '  ', 2026]) {
      await writeFile(configPath, JSON.stringify({ adminKey }));
      expect(() => createAdminMiddleware({ configPath, dataPath })).toThrow();
    }
    for (const cookie of ['memory_arcade_admin=%ZZ', 'memory_arcade_admin=', 'other=value; malformed']) {
      expect((await request(handler, 'GET', '/api/admin/session', undefined, { cookie })).body.authenticated).toBe(false);
    }
    expect((await request(handler, 'GET', '/api/%ZZ')).status).toBe(404);
  });
  it('keeps each concurrent publication atomic and leaves no temporary files', async () => {
    const cookie = await login();
    const first = sampleDraft(), second = sampleDraft();
    first.basics.recipient = '第一份'; second.basics.recipient = '第二份';
    const results = await Promise.all([first, second].map(content => request(handler, 'PUT', '/api/content', content, { cookie })));
    expect(results.map(result => result.status)).toEqual([200, 200]);
    const stored = JSON.parse(await readFile(dataPath, 'utf8'));
    expect([first.basics.recipient, second.basics.recipient]).toContain(stored.basics.recipient);
    expect((await request(handler, 'GET', '/api/content')).body.content).toEqual(stored);
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(join(directory, 'data'))).toEqual(['content.json']);
  });
});
