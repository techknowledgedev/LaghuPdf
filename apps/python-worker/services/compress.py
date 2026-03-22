"""
compress.py — Ghostscript PDF compression service.

Ported and extended from LaghuPdf's pdf_compressor_app.py.
Original Ghostscript parameters preserved and enhanced with additional
quality controls and cross-platform executable detection.
"""
import os
import shutil
import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

router = APIRouter()

# ─── Ghostscript detection ────────────────────────────────────────────────────

def find_ghostscript() -> str:
    """Locate the Ghostscript executable on the current platform."""
    candidates = ["gs", "gswin64c", "gswin32c"]
    for name in candidates:
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError(
        "Ghostscript not found. Install it and ensure it's in your PATH. "
        "Linux: sudo apt install ghostscript / brew install ghostscript (Mac) / "
        "Download from https://ghostscript.com on Windows."
    )


# ─── Request model ────────────────────────────────────────────────────────────

class CompressRequest(BaseModel):
    inputPath: str
    outputPath: str
    preset: str = Field(default="/ebook")
    colorDpi: int = Field(default=150, ge=36, le=600)
    grayDpi: int = Field(default=150, ge=36, le=600)
    monoDpi: int = Field(default=300, ge=36, le=1200)
    jpegQuality: int = Field(default=75, ge=10, le=95)

    @field_validator("preset")
    @classmethod
    def validate_preset(cls, v: str) -> str:
        allowed = {"/screen", "/ebook", "/printer", "/prepress", "/default"}
        if v not in allowed:
            raise ValueError(f"preset must be one of: {', '.join(allowed)}")
        return v

    @field_validator("inputPath", "outputPath")
    @classmethod
    def validate_path_in_tempdir(cls, v: str) -> str:
        temp_dir = os.environ.get("TEMP_DIR", "/tmp/pdftwist")
        # Security: only allow paths within the configured temp directory
        resolved = str(Path(v).resolve())
        temp_resolved = str(Path(temp_dir).resolve())
        if not resolved.startswith(temp_resolved):
            raise ValueError("Path traversal not allowed")
        return v


# ─── Ghostscript compression ──────────────────────────────────────────────────

def build_ghostscript_args(
    gs_executable: str,
    input_path: str,
    output_path: str,
    preset: str,
    color_dpi: int,
    gray_dpi: int,
    mono_dpi: int,
    jpeg_quality: int,
) -> list[str]:
    """
    Construct the Ghostscript command with optimized PDF compression parameters.
    Based on the original LaghuPdf parameters, extended with additional
    stream optimization and compatibility settings.
    """
    return [
        gs_executable,
        # Output device
        "-sDEVICE=pdfwrite",
        # PDF compatibility level (1.4 = Acrobat 5+, wide support)
        "-dCompatibilityLevel=1.4",
        # Quality preset: /screen /ebook /printer /prepress /default
        f"-dPDFSETTINGS={preset}",
        # ── Color image settings ──────────────────────────────────────────────
        "-dDownsampleColorImages=true",
        "-dColorImageDownsampleType=/Average",
        f"-dColorImageResolution={color_dpi}",
        "-dColorImageFilter=/DCTEncode",
        # ── Grayscale image settings ──────────────────────────────────────────
        "-dDownsampleGrayImages=true",
        "-dGrayImageDownsampleType=/Average",
        f"-dGrayImageResolution={gray_dpi}",
        "-dGrayImageFilter=/DCTEncode",
        # ── Monochrome image settings ─────────────────────────────────────────
        "-dDownsampleMonoImages=true",
        "-dMonoImageDownsampleType=/Subsample",
        f"-dMonoImageResolution={mono_dpi}",
        # ── JPEG quality ──────────────────────────────────────────────────────
        f"-dJPEGQ={jpeg_quality}",
        # ── Page and rotation ─────────────────────────────────────────────────
        "-dAutoRotatePages=/None",
        # ── Optimization ─────────────────────────────────────────────────────
        "-dDetectDuplicateImages=true",
        "-dRemoveUnusedObjects=true",
        "-dRemoveUnusedStreams=true",
        "-dCompressFonts=true",
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        # ── Non-interactive batch mode ────────────────────────────────────────
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        # ── Output ────────────────────────────────────────────────────────────
        f"-sOutputFile={output_path}",
        input_path,
    ]


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/compress")
def compress_pdf(req: CompressRequest):
    """
    Compress a PDF using Ghostscript.
    Input and output paths must be within the configured TEMP_DIR.
    """
    # Verify input file exists
    if not os.path.isfile(req.inputPath):
        raise HTTPException(status_code=400, detail="Input file not found")

    try:
        gs = find_ghostscript()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    args = build_ghostscript_args(
        gs_executable=gs,
        input_path=req.inputPath,
        output_path=req.outputPath,
        preset=req.preset,
        color_dpi=req.colorDpi,
        gray_dpi=req.grayDpi,
        mono_dpi=req.monoDpi,
        jpeg_quality=req.jpegQuality,
    )

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=300,  # 5-minute timeout
            check=False,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Ghostscript error (exit {result.returncode}): {result.stderr[:500]}",
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Compression timed out") from None
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to run Ghostscript: {e}") from e

    if not os.path.isfile(req.outputPath):
        raise HTTPException(status_code=500, detail="Ghostscript produced no output")

    return {"status": "ok", "outputPath": req.outputPath}
