# Purrfolio 🐈

A local-first health and life tracker for your pets. Everything lives on your own
machine — a React frontend, a small Express API, and a single JSON file on disk.
Nothing is sent anywhere.

## Requirements

- **Node.js 18, 20, or 22+** (Vite 6's supported range; developed on Node 22.12).
  Check with `node -v`.
- **npm** (ships with Node).

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

`npm run dev` starts two processes side by side (colour-coded in your terminal):

| Process  | What it does                       | Port |
| -------- | ---------------------------------- | ---- |
| `server` | Express API + uploaded files       | 5174 |
| `web`    | Vite dev server (open this one)    | 5173 |

Vite proxies `/api` and `/uploads` through to the API, so you only ever need to
visit port 5173 in development.

On the very first run the server creates `data/data.json`. If
`data/data.example.json` is present, it is used as seed data so you have
something to click through; otherwise you start with an empty database.

## Running the production build

```bash
npm run build
npm start
```

Then open **http://localhost:5174**.

In production mode the Express server also serves the built frontend from
`dist/`, so the whole app is one process on one port. `npm start` will exit with
an error if you haven't run `npm run build` first.

## All scripts

| Command              | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | API + web dev server together (the normal way to work)    |
| `npm run dev:server` | API only, on port 5174                                    |
| `npm run dev:web`    | Vite dev server only, on port 5173                        |
| `npm run build`      | Type-check the project, then build the frontend to `dist/`|
| `npm start`          | Serve API + built frontend in production mode             |
| `npm run preview`    | Preview the built frontend with Vite's own static server  |
| `npm run typecheck`  | TypeScript check with no build output                     |

## Language

The interface is available in **Portuguese (PT-PT)** and **English**. Portuguese is
the default; use the PT/EN toggle in the header, or the Language card in
**Settings**. Your choice is remembered in `localStorage`.

Only the interface is translated. Records are stored identically in both
languages — enum values such as `active` or `checkup` stay English in
`data.json` and are translated for display — so switching language never
rewrites your data, and a file exported in one language imports cleanly in the
other. Dates, numbers and currency follow the selected language too
(`pt-PT` / `en-GB`).

To add or change wording, edit [src/lib/strings.ts](src/lib/strings.ts). The
English catalogue defines the key type and the Portuguese one must implement it,
so a missing translation is a compile error rather than a blank label.

## Configuration

The only environment variable is `PORT`, which sets the API port (default
`5174`). The Vite dev proxy reads the same variable, so in development set it for
both processes at once:

```bash
# macOS / Linux
PORT=6000 npm run dev

# Windows PowerShell
$env:PORT = "6000"; npm run dev
```

The web dev server's own port (5173) is fixed in [vite.config.ts](vite.config.ts).

## Where your data lives

Everything is under `data/`, and all of it is gitignored:

- `data/data.json` — the whole database, one JSON file.
- `data/uploads/` — attached photos and documents.
- `data/backups/` — automatic snapshots. Every write copies the previous
  `data.json` here first, and the 20 most recent are kept.

Writes are serialised and go through a temp file that is atomically renamed into
place, so an interrupted write can't leave a half-written `data.json`.

To back up the app, copy the `data/` folder. The **Settings** page also has
export/import and can restore any of the automatic backups.

## Project layout

```
index.html          Vite entry point
src/                React frontend
  pages/            One file per screen (dashboard, health, weight, …)
  components/       Shared UI, layout, form helpers
  store/            DataContext — loads and caches the database client-side
  lib/              API client, i18n, formatting, derived values
    strings.ts      Every UI string, in PT-PT and English
    i18n.tsx        Language provider, t()/tn()/tEnum() lookups
  anatomy/          Interactive cat-body diagram used for health issues
server/             Express API
  index.js          App setup, routes, static hosting in production
  crud.js           Generic REST routes for every collection
  store.js          JSON persistence, locking, backups
  uploads.js        File uploads (multer), 25 MB per file, 10 at a time
shared/             Code used by both sides
  schema.js         Zod schemas + the list of collections
  types.ts          TypeScript types for the frontend
data/               Your data (gitignored)
```

The path aliases `@/…` → `src/` and `@shared/…` → `shared/` are configured in
both [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json).

## API at a glance

Every collection — `pets`, `issues`, `appointments`, `vaccinations`,
`medications`, `dewormings`, `foods`, `supplies`, `weights`, `careEvents`,
`contacts`, `journal`, `documents` — gets the same REST routes:

```
GET    /api/:collection          list (add ?petId=… to filter)
GET    /api/:collection/:id      one record
POST   /api/:collection          create
PUT    /api/:collection/:id      replace
DELETE /api/:collection/:id      delete, cleaning up references to it
```

Plus:

```
GET    /api/health               liveness + data version
GET    /api/data                 the whole database
PUT    /api/data                 replace the whole database (import)
GET    /api/backups              list automatic backups
POST   /api/backups/:name/restore
POST   /api/uploads              multipart upload, field name "files"
DELETE /api/uploads/:filename
```

## Troubleshooting

**Port already in use** — set `PORT` to something else (see Configuration), or
stop whatever is holding 5173/5174.

**Blank page or "failed to fetch"** — make sure the API process is running too.
`npm run dev:web` alone has nothing to proxy to; use `npm run dev`.

**`dist/ not found` on `npm start`** — run `npm run build` first.

**Want a clean slate** — stop the server and delete `data/data.json`. It will be
recreated from `data/data.example.json` on the next start. Your old data stays in
`data/backups/` until it's pruned.
