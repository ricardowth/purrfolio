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
 * Keeps the weigh-in generated from an appointment's `weightKg` in step with the
 * appointment: created on first save, updated when the value or date changes,
 * and removed when the value is cleared. Runs inside the store lock, so the
 * appointment and its weigh-in are always written together.
 */
function syncAppointmentWeight(db, appointment) {
  const existing = appointment.weightId ? db.weights.find((w) => w.id === appointment.weightId) : null;
  const date = (appointment.dateTime || '').slice(0, 10);

  if (appointment.weightKg && date) {
    if (existing) {
      existing.kg = appointment.weightKg;
      existing.date = date;
      existing.updatedAt = now();
      return;
    }
    const stamp = now();
    const weight = {
      id: randomUUID(),
      petId: appointment.petId,
      date,
      kg: appointment.weightKg,
      notes: '',
      createdAt: stamp,
      updatedAt: stamp,
    };
    db.weights.push(weight);
    appointment.weightId = weight.id;
    return;
  }

  if (existing) {
    db.weights = db.weights.filter((w) => w.id !== existing.id);
  }
  appointment.weightId = '';
}

/** Extra bookkeeping some collections need after a record is written. */
const AFTER_WRITE = { appointments: syncAppointmentWeight };

/**
 * Removes references to a deleted record so the database never points at
 * something that no longer exists.
 */
function cascade(db, collection, id, removed) {
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
  // An appointment owns the weigh-in it generated, so that goes with it.
  if (collection === 'appointments') {
    if (removed?.weightId) db.weights = db.weights.filter((w) => w.id !== removed.weightId);
    // Whatever visit it was booked to follow up on is waiting to be booked again.
    for (const record of db.appointments) if (record.followUpAppointmentId === id) record.followUpAppointmentId = '';
    return;
  }
  if (collection === 'medications' || collection === 'foods') {
    const key = collection === 'medications' ? 'medicationIds' : 'foodIds';
    for (const record of db.appointments) {
      if (record[key]?.includes(id)) record[key] = record[key].filter((x) => x !== id);
    }
    return;
  }
  // A weigh-in deleted on its own leaves the appointment free to generate a new one.
  if (collection === 'weights') {
    for (const record of db.appointments) if (record.weightId === id) record.weightId = '';
    return;
  }
  if (collection === 'contacts') {
    const fields = {
      appointments: ['contactId', 'clinicId'],
      vaccinations: ['contactId', 'clinicId'],
      careEvents: ['caregiverId', 'emergencyContactId'],
    };
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
      AFTER_WRITE[req.collection]?.(db, record);
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
    // Links the server owns are taken from the stored record, never the client.
    if (req.collection === 'appointments') record.weightId = existing.weightId ?? '';
    await update((db) => {
      const rows = db[req.collection];
      rows[rows.findIndex((r) => r.id === record.id)] = record;
      AFTER_WRITE[req.collection]?.(db, record);
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
      cascade(db, collection, id, row);
      return { result: row };
    });
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, deleted: removed });
  });

  return router;
}
