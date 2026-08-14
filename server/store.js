import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyDatabase, normaliseDatabase } from '../shared/schema.js';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const DATA_DIR = path.join(ROOT, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const DATA_FILE = path.join(DATA_DIR, 'data.json');
const TMP_FILE = path.join(DATA_DIR, 'data.json.tmp');
const EXAMPLE_FILE = path.join(DATA_DIR, 'data.example.json');
const MAX_BACKUPS = 20;

/** In-memory copy of the database. Populated by init(), kept in sync by update(). */
let cache = emptyDatabase();

/**
 * Serialises every write. Each queued task runs after the previous one settles,
 * so two concurrent requests can never interleave a read-modify-write cycle.
 */
let queue = Promise.resolve();
function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Create the data directories and bootstrap data.json if this is a first run. */
export async function init() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  if (!(await exists(DATA_FILE))) {
    const seed = (await exists(EXAMPLE_FILE))
      ? normaliseDatabase(JSON.parse(await fs.readFile(EXAMPLE_FILE, 'utf8')))
      : emptyDatabase();
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
    console.log(`[store] created ${path.relative(ROOT, DATA_FILE)}`);
  }

  cache = normaliseDatabase(JSON.parse(await fs.readFile(DATA_FILE, 'utf8')));
  return cache;
}

/** The current database. Callers must not mutate the returned object. */
export function read() {
  return cache;
}

async function pruneBackups() {
  const files = (await fs.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort();
  for (const stale of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
    await fs.rm(path.join(BACKUPS_DIR, stale), { force: true });
  }
}

/**
 * Write the database to disk safely: snapshot the previous version into
 * data/backups/, write to a temp file, then rename it into place. The rename is
 * atomic, so an interrupted write can never leave a half-written data.json.
 */
async function persist(db) {
  if (await exists(DATA_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(DATA_FILE, path.join(BACKUPS_DIR, `data-${stamp}.json`));
    await pruneBackups();
  }
  await fs.writeFile(TMP_FILE, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(TMP_FILE, DATA_FILE);
  cache = db;
}

/**
 * Read-modify-write under the lock. `mutator` receives a deep copy of the
 * database and may either mutate it or return a replacement. Whatever it
 * returns as `result` is passed back to the caller.
 */
export function update(mutator) {
  return withLock(async () => {
    const draft = structuredClone(cache);
    const outcome = await mutator(draft);
    const next = normaliseDatabase(outcome?.db ?? draft);
    await persist(next);
    return outcome?.result;
  });
}

/** Replace the whole database, e.g. when importing a backup. */
export function replaceAll(raw) {
  return update(() => ({ db: normaliseDatabase(raw) }));
}

export async function listBackups() {
  const files = (await fs.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return Promise.all(
    files.map(async (name) => {
      const stat = await fs.stat(path.join(BACKUPS_DIR, name));
      return { name, size: stat.size, savedAt: stat.mtime.toISOString() };
    }),
  );
}

export async function restoreBackup(name) {
  if (!/^data-[\w-]+\.json$/.test(name)) throw new Error('Invalid backup name');
  const file = path.join(BACKUPS_DIR, name);
  if (!(await exists(file))) throw new Error('Backup not found');
  return replaceAll(JSON.parse(await fs.readFile(file, 'utf8')));
}

/** Delete an uploaded file from disk, ignoring anything that isn't a plain filename. */
export async function deleteUpload(filename) {
  if (!filename || filename !== path.basename(filename)) return;
  await fs.rm(path.join(UPLOADS_DIR, filename), { force: true });
}
