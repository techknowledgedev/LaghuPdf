<div align="center">
  <h1>PdfTwist</h1>
  <p><strong>Modern, open-source PDF editor and compressor.<br/>
  Privacy-first. Self-hostable. Works offline.</strong></p>

  <p>
    <a href="#-quick-start-web">Web Deployment</a> •
    <a href="#-desktop-installation">Desktop App</a> •
    <a href="#-features">Features</a> •
    <a href="#-development">Development</a> •
    <a href="#-contributing">Contributing</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js" />
    <img src="https://img.shields.io/badge/python-3.11-blue.svg" alt="Python" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  </p>
</div>

---

## What is PdfTwist?

PdfTwist is a free, open-source PDF toolkit that covers 90% of real-world PDF needs: compression, merging, splitting, page manipulation, and format conversion. It runs entirely in your browser for most operations (no file upload needed), and uses a lightweight server only for Ghostscript-powered compression.

**Deploy it on your server** and give your whole team unlimited PDF tools. **Install the desktop app** for offline, privacy-first operation with no internet required.

### Why not just use ilovepdf / SmallPDF?

| Feature | ilovepdf / SmallPDF | PdfTwist |
|---------|---------------------|----------|
| Cost | Free with limits / paid | 100% Free |
| Privacy | Files sent to their servers | Browser-processed locally |
| Self-hosted | No | Yes (Docker Compose) |
| Open source | No | Yes (MIT License) |
| Desktop offline | No | Yes (Electron app) |
| Ads / Tracking | Yes | Zero telemetry |
| File size limits | Yes | Configurable |

---

## Features

### Phase 1 (Current Release)

| Tool | How it works |
|------|-------------|
| **Compress PDF** | Ghostscript engine, industry standard. 5 quality presets + DPI/JPEG controls |
| **Merge PDFs** | Browser-side via pdf-lib. Drag to reorder files before merging |
| **Split PDF** | By page range or every N pages. Client-side, instant |
| **Page Tools** | Drag-to-reorder thumbnail grid. Rotate, delete, batch-select pages |
| **PDF to Image** | Render PDF pages to PNG/JPEG via PDF.js |
| **Images to PDF** | Combine JPEG/PNG into a PDF. A4, Letter, or original image size |

### Phase 2 (Coming Soon)

- Annotations: highlights, comments, shapes, freehand drawing
- OCR: make scanned PDFs searchable (Tesseract)
- Password protect / unlock PDFs
- Watermarks, page numbers, metadata editor
- Redaction, PDF repair, PDF/A conversion
- Office to/from PDF (Word, Excel, PowerPoint via LibreOffice)

### Phase 3 (Roadmap)

- E-signatures (draw, type, upload image)
- Document comparison
- Form creation (fillable AcroForms)
- Cloud storage integration (Google Drive, Dropbox)
- REST API for automation
- Plugin system

---

## Quick Start (Web)

**Requirements:** Docker Desktop or Docker + Docker Compose v2

```bash
# 1. Clone
git clone https://github.com/techknowledgedev/pdftwist.git
cd pdftwist

# 2. Build the web app (one-time, ~2 min)
docker compose --profile build run web_builder

# 3. Start all services
docker compose up -d

# 4. Open your browser
open http://localhost:8080
```

### Configuration

Copy `.env.example` to `.env`:

```env
PORT=8080                         # Web port (default 8080)
MAX_FILE_SIZE=104857600           # 100 MB per file
OUTPUT_FILE_TTL_MINUTES=30        # Auto-delete output files
RATE_LIMIT_MAX=10                 # Requests/min per IP (0 = disabled)
```

---

## Desktop Installation

Download the latest installer from [GitHub Releases](https://github.com/techknowledgedev/pdftwist/releases):

| Platform | File |
|----------|------|
| Windows | `PdfTwist-Setup-x.y.z.exe` |
| macOS | `PdfTwist-x.y.z.dmg` |
| Linux | `PdfTwist-x.y.z.AppImage` or `.deb` |

The desktop app works **100% offline**. For compression, install Ghostscript:

- **Linux:** `sudo apt install ghostscript`
- **macOS:** `brew install ghostscript`
- **Windows:** [ghostscript.com](https://ghostscript.com/releases/gsdnld.html)

---

## Privacy & Security

- **Browser-first:** Merge, split, rotate, and page management run 100% locally in your browser via pdf-lib. Your PDF never leaves your machine.
- **Server operations:** Only compression uses the server. Temp files deleted within 60 seconds; output files deleted after 30 minutes.
- **Zero telemetry:** No usage tracking, analytics, or data collection of any kind.
- **Security:** Path traversal prevention, magic-byte file validation, rate limiting, strict CORS, Electron contextIsolation.

---

## Development

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.11+
- Ghostscript (for compression)

### Setup

```bash
git clone https://github.com/techknowledgedev/pdftwist.git
cd pdftwist
pnpm install
cp .env.example .env
```

### Run locally

```bash
pnpm dev          # All services in parallel

# Or individually:
pnpm dev:web      # React app → http://localhost:3000
pnpm dev:api      # Fastify API → http://localhost:3001

# Python worker (separate terminal):
cd apps/python-worker
uvicorn main:app --reload --port 8000
```

### Desktop dev

```bash
pnpm dev:desktop  # Electron + live-reload
```

### Tests

```bash
pnpm test
```

---

## Project Structure

```
pdftwist/
├── apps/
│   ├── web/              React + Vite SPA
│   ├── api/              Node.js Fastify API
│   ├── python-worker/    Python FastAPI + Ghostscript
│   └── desktop/          Electron wrapper
├── packages/
│   ├── shared/           Shared TypeScript types + constants
│   └── config/           Shared ESLint / tsconfig
├── docker/               Docker Compose + Dockerfiles + nginx
└── .github/workflows/    CI/CD (tests, Docker, Electron builds)
```

---

## Contributing

PdfTwist is MIT licensed and welcomes all contributions.

- **Translations:** Add a locale file in `apps/web/src/i18n/locales/`
- **Bug reports:** [Open an issue](https://github.com/techknowledgedev/pdftwist/issues)
- **Code:** Fork → branch → PR

---

## Built On

- [PDF.js](https://github.com/mozilla/pdf.js) — Mozilla PDF renderer (Apache 2.0)
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF manipulation (MIT)
- [Ghostscript](https://ghostscript.com/) — Compression engine (AGPL)
- [Fastify](https://fastify.dev/) — Node.js framework (MIT)
- [FastAPI](https://fastapi.tiangolo.com/) — Python API (MIT)
- [@dnd-kit](https://dndkit.com/) — Drag and drop (MIT)

---

## License

MIT © 2025 Twister Security / Devesh Agarwal

*Previously: LaghuPdf v1.0 (Python/Tkinter PDF compressor). PdfTwist is a complete rewrite with full-stack architecture.*
