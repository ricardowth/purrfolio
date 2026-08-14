import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOADS_DIR, deleteUpload } from './store.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  // Store under a generated name so two "scan.pdf"s can't collide; the original
  // name is kept in the attachment record for display.
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 10 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error(`Unsupported file type: ${file.mimetype}`)),
});

/** Multer's File -> the Attachment shape stored in data.json. */
function toAttachment(file) {
  return {
    id: randomUUID(),
    filename: file.filename,
    originalName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    caption: '',
    uploadedAt: new Date().toISOString(),
  };
}

export function uploadsRouter() {
  const router = Router();

  router.post('/', (req, res) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json((req.files ?? []).map(toAttachment));
    });
  });

  // Called when an attachment is removed from a record, so the file doesn't linger.
  router.delete('/:filename', async (req, res) => {
    await deleteUpload(req.params.filename);
    res.json({ ok: true });
  });

  return router;
}
