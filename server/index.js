import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { crudRouter } from './crud.js';
import { uploadsRouter } from './uploads.js';
import { ROOT, UPLOADS_DIR, init, listBackups, read, replaceAll, restoreBackup } from './store.js';

const PORT = Number(process.env.PORT ?? 5174);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, version: read().version }));

// Whole-database read and import, used by the Settings page for backup/restore.
app.get('/api/data', (_req, res) => res.json(read()));

app.put('/api/data', async (req, res) => {
  try {
    await replaceAll(req.body);
    res.json({ ok: true, data: read() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/backups', async (_req, res) => res.json(await listBackups()));

app.post('/api/backups/:name/restore', async (req, res) => {
  try {
    await restoreBackup(req.params.name);
    res.json({ ok: true, data: read() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/api/uploads', uploadsRouter());
app.use('/api', crudRouter());

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1h' }));

// In production the API also serves the built frontend, so the whole app is one
// process on one port. In dev, Vite serves the frontend and proxies here.
if (isProduction) {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('[server] dist/ not found — run `npm run build` first.');
    process.exit(1);
  }
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: err.message ?? 'Internal error' });
});

await init();
app.listen(PORT, () => {
  console.log(`[server] API on http://localhost:${PORT}`);
  if (!isProduction) console.log('[server] open the app at http://localhost:5173');
});
