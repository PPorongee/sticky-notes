# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

포스트잇 보드 (Sticky Notes) — a paste-first digital sticky-note board. `Ctrl+V` text or images onto the board, drag them around, OCR images, and share boards via short links. React 18 + TypeScript + Vite + Tailwind, no traditional backend.

- Deployed on Vercel: https://sticky-notes-lake.vercel.app (GitHub push → auto-deploy, or `vercel --prod --yes`)
- README.md is partially stale — it predates the OCR, sharing, and modal features. Trust the code over the README.

## Commands

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc type-check THEN vite build → dist/
npm run preview   # serve the production build locally
```

There is **no test suite, no linter, and no formatter** configured. `npm run build` runs `tsc` first, so a type error fails the build — this is the only automated gate. `strict: true` is on but `noUnusedLocals`/`noUnusedParameters` are off.

**Caveat:** `npm run dev` (plain Vite) does NOT run the `api/` serverless function, so the **share upload** feature is broken under `npm run dev`. To exercise sharing end-to-end locally, use `vercel dev` (runs the function) or test against the deployed site.

## Architecture

Single-page app. All UI state flows through one hook; all persistence is local (IndexedDB). The only server-side code is one Vercel function used for the share feature.

### State & persistence (the core)
- **`src/store.ts` — `useMemoStore()`** is the single source of truth. `App.tsx` calls it once and threads its actions (`createMemo`, `updateMemo`, `moveToTrash`, `restore`, `permaDelete`, `emptyTrash`, `setColor`) down to components. **All memo mutations must go through this hook** — components never touch the DB directly.
- Every mutation writes through to IndexedDB synchronously via `persist()` → `src/db.ts`. There is no save button and no debounce; React state and IndexedDB are kept in lockstep.
- **`src/db.ts`** is a thin `idb` wrapper over DB `sticky-notes-db`, object store `memos` (keyPath `id`). This is the single swap point for moving to a real backend.
- **Soft delete via `deletedAt`**: trash = set `deletedAt` timestamp; restore = set it back to `null`; only `permaDelete`/`emptyTrash` actually remove rows. `App.tsx` derives `active` (`!deletedAt`) and `trashed` (`!!deletedAt`) from the single `memos` array.

### Data model (`src/types.ts`)
`Memo` has `type` (`text | image | link | code`), `content` (text OR a base64 data URL for images), optional `images[]` (extra attached image data URLs, separate from `content`), position/size, `color`, timestamps, and `deletedAt`. Images are stored inline as data URLs — there is no blob/file storage, so large images bloat IndexedDB and share payloads.

### Input handling (`src/App.tsx`)
This file owns the global `paste`, drag-and-drop, and keyboard handlers — the heart of the UX.
- **Paste** (`handlePaste`, a `window` listener): images are captured regardless of focus; text is ignored when focus is in an input/textarea. If a memo is selected, pasted content is *appended/attached* to it; otherwise a new memo is created. HTML clipboard is preferred over plain text when it preserves more line breaks (`htmlClipboardToText`).
- **Drop**: files dropped on the board become image or text memos at the cursor.
- `detectType()` classifies pasted text (URL → `link`, etc.); `findFreePosition()` places new memos without overlap. Both in `src/utils.ts`.
- **Keyboard** (`N` new memo, `/` focus search, `Delete`/`Backspace` trash selected, `Esc` deselect) — all suppressed while a field is focused or a modal (`expandedId`/`ocrTargetId`) is open.

### OCR (`src/ocr.ts` + `OcrModal`)
Tesseract.js runs **fully in the browser** (`kor`+`eng`), no external API. The worker is a lazy singleton (`ensureWorker`) — first use downloads ~16MB of language data, then it's IndexedDB-cached by Tesseract. Flow: expand an image memo (`MemoModal`) → drag a box over it → `OcrModal` recognizes that region.

### Sharing (`src/share.ts` + `api/share.ts` + `ShareModal`/`ImportPreview`)
- **Upload** (write path, needs the server): `ShareModal` → `uploadShare()` POSTs the `SharePayload` JSON to `/api/share` → the Vercel function (`api/share.ts`) writes it to Vercel Blob at `shares/<id>.json` and returns a short `id`. Share URL = `<origin>/?s=<id>`.
- **Import** (read path, pure client): on load, `App.tsx` reads `?s=<id>` and opens `ImportPreview` → `fetchShare()` fetches `shares/<id>.json` **directly from the Blob base URL** (no function call), then `handleImportMemos` re-creates memos locally with fresh IDs/positions and strips `?s=` from the URL.
- The function caps body at **4 MB** (`api/share.ts` config) and Vercel Hobby caps payloads at ~4.5 MB — boards with many large inline images will fail to upload.
- `VITE_BLOB_BASE_URL` historically arrives with a trailing `\n`; `share.ts` trims it. Keep that trimming if you touch this code.

### Env / Vercel
- `BLOB_READ_WRITE_TOKEN` — server-side, used by `@vercel/blob` `put()`.
- `VITE_BLOB_BASE_URL` — client-side, the public Blob read base (falls back to a hardcoded store URL in `share.ts`).
- `.env.local` holds these locally and is gitignored. `.omc`, `.claude`, `.vercel` are also gitignored.

## Conventions
- Components are presentational and receive store actions as props from `App.tsx`; keep new business logic in `store.ts`/`utils.ts`, not in components.
- Dragging uses Pointer Events (works on touch). New memos get a slight random rotation for a "paper" feel.
- Korean is the primary UI language; keep user-facing strings and error messages in Korean to match the existing tone.
