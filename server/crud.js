import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { COLLECTIONS } from '../shared/schema.js';
import { read, update } from './store.js';

/** Collections whose records belong to a single pet (derived from the schemas). */
const PET_SCOPED = Object.entries(COLLECTIONS)
  .filter(([, schema]) => 'petId' in schema.shape)
  .map(([name]) => name);

const now = () => new Date().toISOString();

function validationError(res, err) {
  return res.status(400).json({
    error: 'Validation failed',
    issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

/**
 * Removes references to a deleted record so the database never points at
 * something that no longer exists.
 */
function cascade(db, collection, id) {
  if (collection === 'pets') {
    for (const name of PET_SCOPED) db[name] = db[name].filter((r) => r.petId !== id);
    return;
  }
  if (collection === 'issues') {
    for (const name of ['appointments', 'medications']) {
      for (const record of db[name]) {
        if (record.issueIds?.includes(id)) record.issueIds = record.issueIds.filter((x) => x !== id);
      }
    }
    return;
  }
  if (collection === 'contacts') {
    const fields = { appointments: ['contactId'], vaccinations: ['contactId'], careEvents: ['caregiverId', 'emergencyContactId'] };
    for (const [name, keys] of Object.entries(fields)) {
      for (const record of db[name]) {
        for (const key of keys) if (record[key] === id) record[key] = '';
      }
    }
  }
}

export function crudRouter() {
  const router = Router();

  router.param('collection', (req, res, next, name) => {
    const schema = COLLECTIONS[name];
    if (!schema) return res.status(404).json({ error: `Unknown collection "${name}"` });
    req.schema = schema;
    req.collection = name;
    next();
  });

  // List, optionally narrowed to one pet.
  router.get('/:collection', (req, res) => {
    const rows = read()[req.collection];
    const { petId } = req.query;
    res.json(petId ? rows.filter((r) => r.petId === petId) : rows);
  });

  router.get('/:collection/:id', (req, res) => {
    const row = read()[req.collection].find((r) => r.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/:collection', async (req, res) => {
    const parsed = req.schema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const stamp = now();
    const record = { ...parsed.data, id: randomUUID(), createdAt: stamp, updatedAt: stamp };
    await update((db) => {
      db[req.collection].push(record);
      return { result: record };
    });
    res.status(201).json(record);
  });

  // Full replace. The client always sends the complete record it edited.
  router.put('/:collection/:id', async (req, res) => {
    const existing = read()[req.collection].find((r) => r.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const parsed = req.schema.safeParse({ ...existing, ...req.body });
    if (!parsed.success) return validationError(res, parsed.error);

    const record = { ...parsed.data, id: existing.id, createdAt: existing.createdAt, updatedAt: now() };
    await update((db) => {
      const rows = db[req.collection];
      rows[rows.findIndex((r) => r.id === record.id)] = record;
      return { result: record };
    });
    res.json(record);
  });

  router.delete('/:collection/:id', async (req, res) => {
    const { collection } = req;
    const id = req.params.id;
    const removed = await update((db) => {
      const rows = db[collection];
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) return { result: null };
      const [row] = rows.splice(index, 1);
      cascade(db, collection, id);
      return { result: row };
    });
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, deleted: removed });
  });

  return router;
}
