# PdfTwist — Comprehensive Implementation Plan

## Context

LaghuPdf is a single-feature Python/Tkinter desktop PDF compressor (~304 lines). The user wants to evolve it into **PdfTwist** — a modern, full-featured, open-source PDF editor and compressor that runs both as a self-hosted web app (multi-user) and as a desktop installable (offline, single-user). The gap between the two is too large for an incremental upgrade; the cleanest path is to repurpose this repository with a complete rewrite using a modern full-stack architecture. The Ghostscript compression parameter set from the existing code will be ported to the new backend.

---

## What the User Didn't Mention (Added to Plan)

| Gap | Recommendation |
|-----|----------------|
| Privacy/security model | All browser-processable operations (merge, split, rotate) run client-side — no file upload needed |
| File lifecycle on server | Processing temp files deleted immediately on completion; **output files retained 30 minutes** then auto-purged |
| Mobile responsiveness | PWA-capable responsive design (touch-friendly drag & drop) |
| Dark mode | System-auto + manual toggle via shadcn/ui themes |
| Keyboard shortcuts | Ctrl+Z undo, Ctrl+M merge, standard shortcuts throughout |
| Undo/redo stack | Per-operation undo stack for page manipulation |
| Internationalization | i18next with 10 initial languages (English, Hindi, Spanish, French, German, Chinese, Japanese, Portuguese, Arabic, Russian) |
| Accessibility | WCAG 2.1 AA compliance — semantic HTML, ARIA labels, keyboard-navigable |
| Batch processing UI | Queue panel supporting 50+ files at once |
| File size limits | Configurable via env vars (default: 100 MB per file, 500 MB total batch) |
| Rate limiting | Server-side rate limiting per IP for web deployment |
| Docker Compose | Single-command `docker compose up` for self-hosting |
| CI/CD pipelines | GitHub Actions for tests, Docker image publish, Electron installers |
| Telemetry | Zero telemetry — explicitly stated in docs |
| Offline desktop mode | Electron app works 100% offline (no server required) |

---

## Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | React + TypeScript + Vite | SPA ideal for tool apps; Vite HMR is fast; same build output for Electron + web |
| Backend | Node.js (Fastify) + Python sidecar (FastAPI) | TypeScript end-to-end; Python for superior PDF compression/OCR (PyMuPDF/Ghostscript) |
| Desktop | Electron | Battle-tested, massive ecosystem, cross-platform; user's choice; same React code |
| UI Library | shadcn/ui + Tailwind CSS | Copy-paste components, fully customizable, no vendor lock-in |
| PDF Rendering | PDF.js (Mozilla) | Industry standard browser PDF renderer |
| PDF Manipulation | pdf-lib (JS) | Pure JavaScript, browser + Node.js, handles merge/split/rotate/extract |
| PDF Compression | Ghostscript via Python sidecar | Superior output quality vs pure JS; existing LaghuPdf parameters reused |
| Drag & Drop | @dnd-kit/core + react-dropzone | @dnd-kit for page reordering grid; react-dropzone for file input zones |
| State Management | Zustand | Lightweight, TypeScript-native, no boilerplate |
| Monorepo | pnpm workspaces + Turborepo | Single lockfile, cross-package imports, parallel builds |
| License | MIT | User's choice; maximum permissive, attracts contributors |

---

## Repository Structure

```
pdftwist/                          # Replaces /home/user/LaghuPdf
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # lint + test on every PR
│       ├── release-electron.yml   # Electron builds (Win/Mac/Linux)
│       └── release-docker.yml     # Docker image publish to GHCR
│
├── apps/
│   ├── web/                       # React + Vite SPA (shared by web + Electron)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx       # tool grid dashboard
│   │   │   │   ├── Compress.tsx
│   │   │   │   ├── Merge.tsx
│   │   │   │   ├── Split.tsx
│   │   │   │   ├── PageTools.tsx  # rotate / reorder / delete / extract
│   │   │   │   └── Convert.tsx    # PDF↔Image
│   │   │   ├── features/          # feature-scoped components
│   │   │   ├── components/
│   │   │   │   ├── DropZone.tsx   # drag-and-drop file input
│   │   │   │   ├── PdfPreview.tsx # PDF.js wrapper
│   │   │   │   ├── PageGrid.tsx   # @dnd-kit reorderable thumbnail grid
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   └── ui/            # shadcn/ui primitives
│   │   │   ├── hooks/
│   │   │   │   ├── usePdfProcessor.ts  # central PDF operation hook
│   │   │   │   ├── useFileDropzone.ts
│   │   │   │   └── useUndoRedo.ts
│   │   │   ├── lib/
│   │   │   │   ├── pdf-client.ts       # pdf-lib wrapper
│   │   │   │   ├── pdf-renderer.ts     # PDF.js wrapper
│   │   │   │   ├── api-client.ts       # HTTP fetch client (web mode)
│   │   │   │   ├── electron-bridge.ts  # IPC bridge (desktop mode)
│   │   │   │   ├── platform.ts         # detects web vs desktop
│   │   │   │   └── i18n.ts             # i18next config
│   │   │   └── store/
│   │   │       └── appStore.ts         # Zustand global state
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                       # Node.js Fastify backend
│   │   ├── src/
│   │   │   ├── server.ts          # Fastify app entry
│   │   │   ├── routes/
│   │   │   │   ├── compress.ts    # POST /api/compress
│   │   │   │   ├── merge.ts       # POST /api/merge
│   │   │   │   ├── split.ts       # POST /api/split
│   │   │   │   ├── convert.ts     # POST /api/convert
│   │   │   │   └── health.ts      # GET /api/health
│   │   │   ├── services/
│   │   │   │   ├── ghostscript.ts # Ghostscript compression service
│   │   │   │   ├── python-sidecar.ts  # HTTP calls to Python FastAPI
│   │   │   │   └── file-cleanup.ts    # auto-delete temp files after 60s
│   │   │   └── middleware/
│   │   │       ├── rate-limit.ts
│   │   │       ├── file-size.ts
│   │   │       └── cors.ts
│   │   └── package.json
│   │
│   ├── python-worker/             # Python FastAPI sidecar
│   │   ├── main.py                # FastAPI entry
│   │   ├── services/
│   │   │   ├── compress.py        # Ghostscript params (ported from LaghuPdf)
│   │   │   ├── ocr.py             # Tesseract OCR (Phase 2)
│   │   │   └── extract.py         # PyMuPDF text/image extraction (Phase 2)
│   │   ├── requirements.txt       # pymupdf, pikepdf, fastapi, uvicorn
│   │   └── Dockerfile
│   │
│   └── desktop/                   # Electron wrapper
│       ├── src/
│       │   ├── main.ts            # Electron main process
│       │   ├── preload.ts         # Context bridge (secure IPC)
│       │   └── ipc-handlers.ts    # File system operations
│       ├── electron-builder.yml   # Build config (Win/Mac/Linux installers)
│       └── package.json
│
├── packages/
│   ├── shared/                    # Shared TypeScript types + utils
│   │   ├── src/
│   │   │   ├── types.ts           # PDFJob, CompressionLevel, etc.
│   │   │   └── constants.ts       # DPI defaults, quality presets
│   │   └── package.json
│   │
│   └── config/                    # Shared ESLint, Prettier, tsconfig
│       ├── eslint.js
│       ├── prettier.js
│       └── tsconfig.base.json
│
├── docker/
│   ├── docker-compose.yml         # Full stack: web + api + python-worker + nginx
│   ├── docker-compose.dev.yml     # Development override
│   ├── nginx.conf                 # Reverse proxy config
│   └── Dockerfile.api             # Node.js API image
│
├── docs/
│   ├── getting-started.md
│   ├── self-hosting.md            # Docker Compose deployment guide
│   ├── desktop-install.md
│   ├── architecture.md
│   └── contributing.md
│
├── assets/
│   ├── icon.png                   # PdfTwist icon (1024x1024)
│   ├── icon.ico                   # Windows icon
│   └── screenshots/
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                   # Root package.json
├── .gitignore
├── .env.example
├── LICENSE                        # MIT
└── README.md
```

---

## Tech Stack Summary

**Frontend (apps/web)**
- React 18 + TypeScript + Vite 5
- shadcn/ui + Tailwind CSS 4
- PDF.js (Mozilla) — PDF rendering/preview
- pdf-lib — browser-side merge, split, rotate, extract
- @dnd-kit/core — page reorder drag-and-drop
- react-dropzone — file input drop zones
- Zustand — state management
- i18next — internationalization (10 languages)
- React Router v7

**Backend (apps/api)**
- Node.js 20 LTS + Fastify 4 + TypeScript
- @fastify/multipart — file upload handling
- @fastify/rate-limit — IP-based rate limiting
- multer-compatible temp file handling
- Axios — HTTP calls to Python sidecar

**Python Sidecar (apps/python-worker)**
- Python 3.11 + FastAPI + Uvicorn
- PyMuPDF (fitz) — PDF processing
- pikepdf — low-level PDF manipulation
- Ghostscript (system dependency) — compression
- Tesseract (Phase 2) — OCR

**Desktop (apps/desktop)**
- Electron 31 + electron-builder
- Electron IPC via contextBridge (secure preload)
- Embeds the Fastify API + Python worker as sidecar processes

**Infrastructure**
- Docker + Docker Compose (web deployment)
- GitHub Actions (CI, releases)
- Turborepo (monorepo build orchestration)
- pnpm workspaces

---

## Phase 1 — MVP (Priority Order)

### Step 1: Monorepo Scaffold
- Initialize pnpm workspace with Turborepo
- Create `packages/shared` with types and constants
- Create `packages/config` with shared ESLint/Prettier/tsconfig
- Set up `turbo.json` with build/dev/lint pipelines

### Step 2: React Web App Foundation
- Create `apps/web` with Vite + React + TypeScript
- Install and configure shadcn/ui + Tailwind CSS
- Set up React Router v7 with routes for all tool pages
- Build `DropZone.tsx` component with react-dropzone
- Build `Home.tsx` — tool grid dashboard (responsive, dark mode)
- Implement i18next with English as base language
- Set up Zustand store

### Step 3: PDF Viewer/Preview
- Integrate PDF.js into `PdfPreview.tsx`
- Build `PageGrid.tsx` — thumbnail grid with @dnd-kit drag-to-reorder
- Build `ThumbnailStrip.tsx` — horizontal strip for page selection

### Step 4: Client-side PDF Operations (pdf-lib)
- `lib/pdf-client.ts` — wrapper for all pdf-lib operations
- Implement: merge, split by range, rotate pages, delete pages, extract pages, reorder pages
- All operations run in browser Web Worker for non-blocking UI
- Undo/redo stack via `useUndoRedo.ts` hook
- Build UI pages: `Merge.tsx`, `Split.tsx`, `PageTools.tsx`

### Step 5: Node.js API Server
- Create `apps/api` with Fastify + TypeScript
- File upload endpoint with size validation and temp file management
- `file-cleanup.ts` — auto-delete temp files after 60 seconds
- CORS configuration for web app
- Rate limiting middleware
- Health check endpoint

### Step 6: PDF Compression (Server-side)
- Port Ghostscript parameters from `pdf_compressor_app.py` to `apps/python-worker/services/compress.py`
- FastAPI endpoint: `POST /compress` with quality, DPI, and JPEG quality params
- Node.js API proxies to Python worker
- Build `Compress.tsx` with quality selector, DPI controls, before/after size display

### Step 7: PDF-to-Image & Image-to-PDF
- PDF-to-Image: Server-side via PyMuPDF (renders pages to PNG/JPEG)
- Image-to-PDF: Client-side via pdf-lib
- Build `Convert.tsx`

### Step 8: Electron Desktop App
- Create `apps/desktop` with Electron + electron-builder
- Configure contextBridge preload for secure IPC
- Embed Fastify API + Python worker as sidecar processes
- `platform.ts` — detects Electron vs browser, routes operations accordingly
- Configure electron-builder for Windows (.exe installer), macOS (.dmg), Linux (.AppImage, .deb)

### Step 9: Docker Compose Deployment
- `docker-compose.yml` with services: `web` (nginx static), `api` (Node.js), `worker` (Python FastAPI), `nginx` (reverse proxy)
- `.env.example` with all configurable values
- Health checks and restart policies
- Volume mount for temp file processing

### Step 10: Testing & CI
- Vitest for unit tests (pdf-client.ts operations)
- Playwright for E2E tests (upload → process → download flow)
- GitHub Actions `ci.yml` — runs tests + lint on every PR
- GitHub Actions `release-electron.yml` — builds installers on tag push
- GitHub Actions `release-docker.yml` — publishes Docker image to GHCR

---

## iLovePDF Feature Audit (Gap Analysis vs PdfTwist Roadmap)

iLovePDF offers 25+ tools, all of which PdfTwist targets. Features mapped to phases:

| iLovePDF Feature | PdfTwist Phase | Notes |
|---|---|---|
| Merge PDF | Phase 1 | Client-side via pdf-lib |
| Split PDF | Phase 1 | Client-side via pdf-lib |
| Compress PDF | Phase 1 | Server-side via Ghostscript |
| PDF to JPG | Phase 1 | Server-side via PyMuPDF |
| JPG to PDF | Phase 1 | Client-side via pdf-lib |
| Page rotation / reorder / delete | Phase 1 | Client-side via pdf-lib |
| PDF to Word | Phase 2 | LibreOffice headless |
| PDF to PowerPoint | Phase 2 | LibreOffice headless |
| PDF to Excel | Phase 2 | LibreOffice headless |
| Word/PPT/Excel to PDF | Phase 2 | LibreOffice headless |
| HTML to PDF | Phase 2 | Puppeteer/headless Chrome |
| PDF to HTML | Phase 2 | Python worker (pdfminer/PyMuPDF) |
| OCR (scanned → searchable) | Phase 2 | Tesseract via Python worker |
| Password protect | Phase 2 | pdf-lib encryption |
| Unlock PDF | Phase 2 | pikepdf |
| Watermark | Phase 2 | pdf-lib overlay |
| Page numbers | Phase 2 | pdf-lib |
| Annotate (text, shapes, draw) | Phase 2 | Canvas overlay + pdf-lib |
| Repair PDF | Phase 2 | pikepdf (QPDF repair mode) |
| Redact (black out) | Phase 2 | PyMuPDF redaction API |
| PDF/A conversion | Phase 2 | Ghostscript PDF/A output |
| E-signatures | Phase 3 | Draw/type/image + cryptographic signing |
| Document comparison | Phase 3 | Diff engine (pdfminer text extract + diff) |
| Google Drive / Dropbox integration | Phase 3 | OAuth2 cloud picker |
| REST API for automation | Phase 3 | Fastify API + API key auth |
| Mobile app (iOS / Android) | Phase 4 | Capacitor wrapping the React SPA |

---

## PDF Editing Capabilities — Honest Technical Assessment

### What "Full PDF Editing" Actually Means (Adobe/Foxit Level)

Full in-place text editing with reflow — as in Adobe Acrobat — **cannot be replicated with open-source tools today**. This is not a tooling gap; it is a fundamental PDF format problem:

- PDF text is stored as positioned glyphs, not editable paragraphs
- Changing "the" to "something else" leaves a space gap unless all glyph positions are recalculated
- Fonts are embedded as subsets; the full font is often not present to support additional characters
- Adobe uses 30 years of proprietary layout reconstruction algorithms

**What open-source tools CAN do (and PdfTwist will deliver):**

| Capability | Approach | Quality |
|---|---|---|
| Add new text boxes anywhere | pdf-lib + canvas | Excellent |
| Highlight / underline / strikethrough | pdf-lib annotations | Excellent |
| Freehand drawing / shapes | Canvas layer | Excellent |
| Comments and sticky notes | pdf-lib annotations | Excellent |
| Fill AcroForm fields | pdf-lib | Excellent |
| Replace simple text strings (fixed layout) | PyMuPDF `page.search_for` + redact + insert | Good (simple PDFs) |
| Move/resize images | PyMuPDF + pikepdf | Good |
| Redact (permanently black out) | PyMuPDF redaction | Excellent |
| Object-level edit (import to ODG, edit, re-export) | LibreOffice Draw headless | Fair (complex PDFs degrade) |
| True inline text reflow | ❌ Not achievable without proprietary algorithms | — |

### Strategy: "Non-Destructive Rich Editing"

PdfTwist's editing model:
1. **Overlay layer** — All annotations, text boxes, shapes, signatures sit in a separate annotation layer on top of the original content. Original is never destructively modified. This is the same approach Acrobat Reader uses for non-owner editing.
2. **Content replacement** — For simple single-font text replacement (PyMuPDF), offer it with a clear warning: "Complex layouts may shift. Preview before saving."
3. **Import-edit-export** — For users who need deep editing, a LibreOffice headless pipeline: PDF → ODG/ODT → user edits via embedded LibreOffice Online (ONLYOFFICE/Collabora) → PDF. This is Phase 4 territory.

**Positioning**: PdfTwist handles 80–90% of real-world PDF editing needs better than any open-source tool today. For the remaining 10% (full document reflow editing), it will guide users to the right tool rather than pretend to do it poorly.

---

## Phase 2 — Enhanced Features

- PDF Annotation — highlights, underlines, strikethrough, comments, sticky notes, shapes, freehand draw (pdf-lib annotation layer + canvas)
- Content replacement — simple text find & replace for fixed-layout PDFs (PyMuPDF with preview)
- Image replacement / extraction — swap images in existing PDFs (PyMuPDF + pikepdf)
- OCR — Tesseract via Python worker, adds searchable text layer to scanned PDFs
- Password protect / unlock PDFs — pdf-lib + pikepdf
- Watermark — text and image overlay (pdf-lib)
- Page numbers — add/customize page numbering (pdf-lib)
- Metadata editor — title, author, keywords, creation date (pdf-lib)
- PDF Repair — fix corrupted PDFs (QPDF via pikepdf)
- Redaction — permanently black out sensitive content (PyMuPDF redaction API)
- PDF/A conversion — ISO archiving standard output (Ghostscript)
- Office ↔ PDF conversion — Word, Excel, PowerPoint (LibreOffice headless)
- HTML to PDF — (Puppeteer headless Chrome)
- PDF to HTML — (PyMuPDF / pdfminer)
- Batch processing queue UI — process 50+ files with live progress
- Additional i18next languages (target: 10 total)

---

## Phase 3 — Advanced Features

- E-signatures — draw, type, upload image; cryptographic signing with audit trail (pdf-lib + Web Crypto API)
- Document comparison — diff two PDF versions, highlight changes
- Form creation — build fillable forms from scratch (pdf-lib AcroForm API)
- Google Drive / Dropbox integration — OAuth2 cloud file picker and save-back
- REST API for automation — API key auth, documented OpenAPI spec
- Plugin/extension system — hook-based plugin loader
- Collaboration / shareable links — time-limited share URLs (web version)

---

## Phase 4 — Deep Editing (Long-Term)

- Embedded document editor integration (Collabora Online or ONLYOFFICE) for import-edit-export PDF workflow
- Mobile apps — iOS and Android via Capacitor wrapping the React SPA
- AI-powered features — summarize, translate, auto-redact PII (via Claude API)

---

## Migration from LaghuPdf

**Files to archive (move to `_archive/` or delete):**
- `pdf_compressor_app.py` — replace with Python worker service
- `pdf_compressor_gs.py` — Ghostscript params to be ported to `apps/python-worker/services/compress.py`
- `LaghuPdf.spec`, `pdf_compressor_app.spec` — PyInstaller, replaced by electron-builder
- `build/`, `dist/` directories — remove

**Files to keep/repurpose:**
- `Icon.ico`, `Logo.png` — reuse as PdfTwist branding basis (or replace)
- `README.md` — completely rewrite for PdfTwist
- `PDF_Compressor_User_Guide.md` — fold into `docs/` structure

**Git strategy:**
- Create branch `claude/plan-pdftwist-editor-XjqDZ` (already the working branch)
- First commit: archive existing files, create new monorepo scaffold
- Tag old state as `v1.0-laghupdf` before cleanup

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Malicious PDF upload | File type validation (magic bytes, not just extension); sandboxed processing |
| File retention | Processing temp files deleted immediately; output files auto-deleted after 30 minutes |
| Path traversal | UUID-based temp filenames, never use user-provided filenames for paths |
| XSS via PDF metadata | Sanitize all extracted text before rendering |
| CORS | Strict origin allowlist in API |
| Rate limiting | 10 requests/minute per IP for server endpoints |
| Electron security | contextIsolation: true, nodeIntegration: false, strict CSP |
| Dependency supply chain | Dependabot + npm audit in CI |

---

## Verification (End-to-End Testing)

1. **Web (Docker)**: `docker compose up` → open `http://localhost:3000` → upload PDF → compress → download → verify file size reduction
2. **Web (dev)**: `pnpm dev` → all three services start → test merge, split, rotate in browser
3. **Desktop (dev)**: `pnpm --filter desktop dev` → Electron window opens → test offline file operations
4. **Desktop (installer)**: `pnpm --filter desktop build` → run `.exe` / `.dmg` → verify no internet required
5. **Unit tests**: `pnpm test` → Vitest runs pdf-client.ts merge/split/rotate operations
6. **E2E tests**: `pnpm test:e2e` → Playwright uploads test PDF and validates all tool outputs

---

## Critical Files to Create First

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Monorepo workspace definition |
| `turbo.json` | Build pipeline |
| `packages/shared/src/types.ts` | Shared TypeScript interfaces |
| `apps/web/vite.config.ts` | Vite + React config |
| `apps/web/src/lib/platform.ts` | Web vs Electron detection |
| `apps/web/src/lib/pdf-client.ts` | pdf-lib wrapper (core processing) |
| `apps/web/src/components/DropZone.tsx` | File input (critical UX) |
| `apps/web/src/components/PageGrid.tsx` | Drag-to-reorder thumbnail grid |
| `apps/api/src/server.ts` | Fastify API entry |
| `apps/api/src/services/file-cleanup.ts` | Immediate temp deletion + 30-min output file expiry scheduler |
| `apps/python-worker/services/compress.py` | Ghostscript params (ported from LaghuPdf) |
| `docker/docker-compose.yml` | Self-hosting deployment |
| `apps/desktop/src/main.ts` | Electron main process |
