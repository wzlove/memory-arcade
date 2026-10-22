import { defineConfig } from 'vite';
import { createAdminMiddleware, normalizeBasePath } from './server/admin.js';

const base = normalizeBasePath(process.env.BASE_PATH || '/');

export default defineConfig({
  base,
  plugins: [{ name: 'memory-arcade-admin', configureServer(server) {
    server.middlewares.use(createAdminMiddleware({ basePath: base }));
  } }],
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/config/**', '**/.data/**', '**/server/**'] } },
});
