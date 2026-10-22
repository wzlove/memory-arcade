import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createStaticHandler } from './index.js';

let directory, distPath, handler;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'memory-arcade-static-'));
  distPath = join(directory, 'dist'); await mkdir(distPath);
  await writeFile(join(distPath, 'index.html'), '<h1>Game</h1>');
  await writeFile(join(distPath, 'studio.html'), '<h1>Admin</h1>');
  await writeFile(join(directory, 'secret.json'), 'private');
  await symlink(join(directory, 'secret.json'), join(distPath, 'linked.json'));
  handler = createStaticHandler({ distPath, basePath: '/game/' });
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
async function request(url, method = 'GET') {
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(value = '') { this.body = String(value); } };
  await handler({ url, method }, res);
  return res;
}
it('serves build files under the configured path without exposing secrets, traversal or symlinks', async () => {
  expect((await request('/game/')).body).toBe('<h1>Game</h1>');
  expect((await request('/game/studio.html')).body).toBe('<h1>Admin</h1>');
  for (const path of ['/game/../secret.json', '/game/%2e%2e/secret.json', '/game/%2e%2e%2fsecret.json', '/game/%2e%2e%5csecret.json', '/game/%00secret', '/game/%ZZ', '/game/.env', '/game/linked.json', '/config/admin.json', '/game/config/admin.json']) {
    expect((await request(path)).statusCode).toBe(404);
  }
});
it('redirects a missing base slash, supports HEAD and rejects unsupported methods', async () => {
  expect((await request('/game')).headers.location).toBe('/game/');
  expect((await request('/game/studio.html', 'HEAD')).body).toBe('');
  expect((await request('/game/', 'POST')).statusCode).toBe(405);
});
