import { useState, useCallback, useRef, useEffect } from "react";
import {
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { applyRedactions, getPdfPageCount, type RedactionRect } from "@/lib/pdf-client";
import { renderPage, loadPdfDocument } from "@/lib/pdf-renderer";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

export default function RedactPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [redactions, setRedactions] = useState<(RedactionRect & { id: string })[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const drawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setRedactions([]);
    setCurrentPage(0);

    const buf = await f.arrayBuffer();
    setFileBuffer(buf);
    setPageCount(await getPdfPageCount(buf));
  }, []);

  // Render current page
  useEffect(() => {
    if (!fileBuffer) return;
    const render = async () => {
      setLoading(true);
      try {
        const doc = await loadPdfDocument(fileBuffer);
        const containerWidth = containerRef.current?.clientWidth ?? 700;
        const page = await doc.getPage(currentPage + 1);
        const vp = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / vp.width, 800 / vp.height);
        const rendered = await renderPage(doc, currentPage + 1, scale);

        setCanvasSize({ width: rendered.width, height: rendered.height });

        const bgCanvas = bgCanvasRef.current;
        if (bgCanvas) {
          bgCanvas.width = rendered.width;
          bgCanvas.height = rendered.height;
          const ctx = bgCanvas.getContext("2d")!;
          ctx.drawImage(rendered.canvas, 0, 0);
        }
        doc.destroy();
      } catch {
        setError("Failed to render page.");
      } finally {
        setLoading(false);
      }
    };
    render();
  }, [fileBuffer, currentPage]);

  // Draw redaction overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || canvasSize.width === 0) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageReds = redactions.filter((r) => r.pageIndex === currentPage);
    for (const rect of pageReds) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(
        rect.x * canvas.width,
        rect.y * canvas.height,
        rect.width * canvas.width,
        rect.height * canvas.height
      );
      // Redaction cross-hatch pattern
      ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      const rx = rect.x * canvas.width;
      const ry = rect.y * canvas.height;
      const rw = rect.width * canvas.width;
      const rh = rect.height * canvas.height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.moveTo(rx + rw, ry);
      ctx.lineTo(rx, ry + rh);
      ctx.stroke();
    }
  }, [redactions, currentPage, canvasSize]);

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    drawingRef.current = true;
    startRef.current = getCanvasPos(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    const pos = getCanvasPos(e);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    // Redraw existing redactions
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageReds = redactions.filter((r) => r.pageIndex === currentPage);
    for (const rect of pageReds) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(rect.x * canvas.width, rect.y * canvas.height, rect.width * canvas.width, rect.height * canvas.height);
    }

    // Draw preview rectangle
    const x = Math.min(startRef.current.x, pos.x) * canvas.width;
    const y = Math.min(startRef.current.y, pos.y) * canvas.height;
    const w = Math.abs(pos.x - startRef.current.x) * canvas.width;
    const h = Math.abs(pos.y - startRef.current.y) * canvas.height;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const pos = getCanvasPos(e);
    const start = startRef.current;
    const x = Math.min(start.x, pos.x);
    const y = Math.min(start.y, pos.y);
    const w = Math.abs(pos.x - start.x);
    const h = Math.abs(pos.y - start.y);

    if (w < 0.01 && h < 0.01) return; // too small

    setRedactions((prev) => [
      ...prev,
      {
        id: `red-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pageIndex: currentPage,
        x,
        y,
        width: w,
        height: h,
      },
    ]);
  };

  const undoLast = () => {
    setRedactions((prev) => {
      const pageReds = prev.filter((r) => r.pageIndex === currentPage);
      if (pageReds.length === 0) return prev;
      const lastId = pageReds[pageReds.length - 1].id;
      return prev.filter((r) => r.id !== lastId);
    });
  };

  const clearPage = () => {
    setRedactions((prev) => prev.filter((r) => r.pageIndex !== currentPage));
  };

  const handleSave = async () => {
    if (!fileBuffer || redactions.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      setProgress(50);
      const output = await applyRedactions(fileBuffer, redactions);
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file!.name, "_redacted"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Redactions applied successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply redactions.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setRedactions([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setCurrentPage(0);
  };

  const pageRedactionCount = redactions.filter((r) => r.pageIndex === currentPage).length;
  const totalRedactionCount = redactions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
          <EyeOff size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Redact PDF</h1>
          <p className="text-sm text-slate-400">
            Black out sensitive content — draw rectangles over areas to redact
          </p>
        </div>
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <>
              {/* Warning */}
              <div className="flex items-start gap-3 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                  Visual redaction only — black rectangles are drawn over content. For complete
                  content removal (removing underlying text/data), use a server-side tool.
                </p>
              </div>

              {/* Toolbar */}
              <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 mr-2">
                  Draw rectangles to mark areas for redaction
                </span>

                <div className="flex-1" />

                <button
                  onClick={undoLast}
                  disabled={pageRedactionCount === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs disabled:opacity-30 transition-colors"
                >
                  <Undo2 size={13} /> Undo
                </button>
                <button
                  onClick={clearPage}
                  disabled={pageRedactionCount === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={13} /> Clear page
                </button>

                <span className="text-xs text-slate-500 ml-2">
                  {totalRedactionCount} redaction{totalRedactionCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Page navigation */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-300 font-mono">
                  Page {currentPage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={currentPage >= pageCount - 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Canvas area */}
              <div ref={containerRef} className="flex justify-center">
                <div
                  className="relative border border-white/10 rounded-lg overflow-hidden shadow-2xl bg-white"
                  style={{ width: canvasSize.width || "100%", height: canvasSize.height || 600 }}
                >
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                      <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                  <canvas ref={bgCanvasRef} className="absolute inset-0" />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => { drawingRef.current = false; }}
                  />
                </div>
              </div>

              {processing && <ProgressBar value={progress} label="Applying redactions..." />}
              {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              <button
                onClick={handleSave}
                disabled={processing || redactions.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <EyeOff size={16} />
                  {processing ? "Applying..." : `Apply ${totalRedactionCount} Redaction${totalRedactionCount !== 1 ? "s" : ""}`}
                </span>
              </button>
            </>
          )}
        </>
      )}

      {result && (
        <div className="max-w-md mx-auto">
          <OutputCard
            url={result.url}
            filename={result.name}
            outputSizeBytes={result.size}
            inputSizeBytes={file?.size}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}
