"""
PdfTwist Python Worker — FastAPI service for server-side PDF operations.
Handles compression (Ghostscript), OCR (Tesseract Phase 2),
and other operations that require native libraries.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.compress import router as compress_router

app = FastAPI(
    title="PdfTwist Python Worker",
    version="0.1.0",
    docs_url="/docs" if os.getenv("SHOW_DOCS", "false").lower() == "true" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Only accept calls from the Node API
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(compress_router)


@app.get("/health")
def health():
    import shutil
    gs = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    return {
        "status": "ok",
        "ghostscript": gs is not None,
        "ghostscript_path": gs,
    }
