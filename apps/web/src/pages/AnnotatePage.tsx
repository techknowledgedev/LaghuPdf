import { useState, useCallback, useRef, useEffect } from "react";
import {
  PenLine,
  Type,
  Highlighter,
  Square,
  Circle,
  Minus,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Undo2,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { applyAnnotations, getPdfPageCount, type PdfAnnotation } from "@/lib/pdf-client";
import { renderPage, loadPdfDocument } from "@/lib/pdf-renderer";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

type Tool = "text" | "highlight" | "rectangle" | "circle" | "line" | "freehand" | "select";

const TOOLS: { key: Tool; icon: typeof Type; label: string }[] = [
  { key: "select", icon: PenLine, label: "Select" },
  { key: "text", icon: Type, label: "Text" },
  { key: "highlight", icon: Highlighter, label: "Highlight" },
  { key: "rectangle", icon: Square, label: "Rectangle" },
  { key: "circle", icon: Circle, label: "Circle" },
  { key: "line", icon: Minus, label: "Line" },
  { key: "freehand", icon: Pencil, label: "Draw" },
];

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#000000",
];

function hexToRgbObj(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0, g: 0, b: 0 };
}

export default function AnnotatePage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#ef4444");
  const [fontSize, setFontSize] = useState(16);
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Drawing state
  const drawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const freehandPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setAnnotations([]);
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

  // Draw annotation overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || canvasSize.width === 0) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnns = annotations.filter((a) => a.pageIndex === currentPage);

    for (const ann of pageAnns) {
      const x = ann.x * canvas.width;
      const y = ann.y * canvas.height;
      const hex =
        `#${Math.round(ann.color.r * 255).toString(16).padStart(2, "0")}${Math.round(ann.color.g * 255).toString(16).padStart(2, "0")}${Math.round(ann.color.b * 255).toString(16).padStart(2, "0")}`;

      ctx.save();
      ctx.globalAlpha = ann.opacity;

      switch (ann.type) {
        case "text":
          ctx.fillStyle = hex;
          ctx.font = `${ann.fontSize ?? 14}px Helvetica, Arial, sans-serif`;
          ctx.fillText(ann.text ?? "", x, y + (ann.fontSize ?? 14));
          break;
        case "highlight":
          ctx.fillStyle = hex;
          ctx.globalAlpha = ann.opacity * 0.35;
          ctx.fillRect(x, y, (ann.width ?? 0) * canvas.width, (ann.height ?? 0) * canvas.height);
          break;
        case "rectangle":
          if (ann.filled) {
            ctx.fillStyle = hex;
            ctx.fillRect(x, y, (ann.width ?? 0) * canvas.width, (ann.height ?? 0) * canvas.height);
          } else {
            ctx.strokeStyle = hex;
            ctx.lineWidth = ann.lineWidth ?? 2;
            ctx.strokeRect(x, y, (ann.width ?? 0) * canvas.width, (ann.height ?? 0) * canvas.height);
          }
          break;
        case "circle": {
          const w = (ann.width ?? 0) * canvas.width;
          const h = (ann.height ?? 0) * canvas.height;
          ctx.strokeStyle = hex;
          ctx.lineWidth = ann.lineWidth ?? 2;
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "line":
          ctx.strokeStyle = hex;
          ctx.lineWidth = ann.lineWidth ?? 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo((ann.endX ?? 0) * canvas.width, (ann.endY ?? 0) * canvas.height);
          ctx.stroke();
          break;
        case "freehand":
          if (ann.points && ann.points.length > 1) {
            ctx.strokeStyle = hex;
            ctx.lineWidth = ann.lineWidth ?? 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x * canvas.width, ann.points[0].y * canvas.height);
            for (let i = 1; i < ann.points.length; i++) {
              ctx.lineTo(ann.points[i].x * canvas.width, ann.points[i].y * canvas.height);
            }
            ctx.stroke();
          }
          break;
      }
      ctx.restore();
    }
  }, [annotations, currentPage, canvasSize]);

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "select") return;
    if (tool === "text") {
      const pos = getCanvasPos(e);
      setTextInput({ x: pos.x, y: pos.y, visible: true });
      setTextValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    drawingRef.current = true;
    const pos = getCanvasPos(e);
    startRef.current = pos;

    if (tool === "freehand") {
      freehandPointsRef.current = [pos];
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;

    if (tool === "freehand") {
      const pos = getCanvasPos(e);
      freehandPointsRef.current.push(pos);
      // Live preview on overlay
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        const pts = freehandPointsRef.current;
        if (pts.length > 1) {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          const p1 = pts[pts.length - 2];
          const p2 = pts[pts.length - 1];
          ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
          ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          ctx.stroke();
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const end = tool === "freehand"
      ? freehandPointsRef.current[freehandPointsRef.current.length - 1]
      : startRef.current;

    const colorObj = hexToRgbObj(color);
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base = { id, pageIndex: currentPage, color: colorObj, opacity, lineWidth };

    if (tool === "freehand") {
      if (freehandPointsRef.current.length > 1) {
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "freehand", x: 0, y: 0, points: [...freehandPointsRef.current] },
        ]);
      }
      freehandPointsRef.current = [];
      return;
    }

    // For shapes, compute from start to current mouse position
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    const finalPos = end; // we need the actual end pos
    // Actually, we need the mouse position at mouseup. Let me fix this:
    // The start is startRef.current, we need to get end from the event
    // Since we don't have the event here, let's track it differently
    setAnnotations((prev) => prev); // placeholder, see below
  };

  // Actually, let me refactor to pass event to mouseUp
  const handleMouseUpWithEvent = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const pos = getCanvasPos(e);
    const start = startRef.current;
    const colorObj = hexToRgbObj(color);
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base = { id, pageIndex: currentPage, color: colorObj, opacity, lineWidth };

    if (tool === "freehand") {
      freehandPointsRef.current.push(pos);
      if (freehandPointsRef.current.length > 1) {
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "freehand", x: 0, y: 0, points: [...freehandPointsRef.current] },
        ]);
      }
      freehandPointsRef.current = [];
      return;
    }

    const x = Math.min(start.x, pos.x);
    const y = Math.min(start.y, pos.y);
    const w = Math.abs(pos.x - start.x);
    const h = Math.abs(pos.y - start.y);

    if (w < 0.005 && h < 0.005) return; // too small

    switch (tool) {
      case "highlight":
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "highlight", x, y, width: w, height: h },
        ]);
        break;
      case "rectangle":
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "rectangle", x, y, width: w, height: h },
        ]);
        break;
      case "circle":
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "circle", x, y, width: w, height: h },
        ]);
        break;
      case "line":
        setAnnotations((prev) => [
          ...prev,
          { ...base, type: "line", x: start.x, y: start.y, endX: pos.x, endY: pos.y },
        ]);
        break;
    }
  };

  const confirmText = () => {
    if (!textValue.trim()) {
      setTextInput((p) => ({ ...p, visible: false }));
      return;
    }
    const colorObj = hexToRgbObj(color);
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAnnotations((prev) => [
      ...prev,
      {
        id,
        type: "text",
        pageIndex: currentPage,
        x: textInput.x,
        y: textInput.y,
        text: textValue,
        fontSize,
        color: colorObj,
        opacity,
        lineWidth: 0,
      },
    ]);
    setTextInput((p) => ({ ...p, visible: false }));
    setTextValue("");
  };

  const undoLast = () => {
    setAnnotations((prev) => {
      const pageAnns = prev.filter((a) => a.pageIndex === currentPage);
      if (pageAnns.length === 0) return prev;
      const lastId = pageAnns[pageAnns.length - 1].id;
      return prev.filter((a) => a.id !== lastId);
    });
  };

  const clearPage = () => {
    setAnnotations((prev) => prev.filter((a) => a.pageIndex !== currentPage));
  };

  const handleSave = async () => {
    if (!fileBuffer || annotations.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      setProgress(50);
      const output = await applyAnnotations(fileBuffer, annotations);
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file!.name, "_annotated"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Annotations saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save annotations.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setAnnotations([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setCurrentPage(0);
  };

  const pageAnnotationCount = annotations.filter((a) => a.pageIndex === currentPage).length;
  const totalAnnotationCount = annotations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
          <PenLine size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Annotate PDF</h1>
          <p className="text-sm text-slate-400">
            Add text, highlights, shapes, and freehand drawings — processed in browser
          </p>
        </div>
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <>
              {/* Toolbar */}
              <div className="glass rounded-2xl p-3 space-y-3">
                {/* Tools row */}
                <div className="flex items-center gap-1 flex-wrap">
                  {TOOLS.map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setTool(key)}
                      title={label}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tool === key
                          ? "bg-rose-500/30 text-rose-200 border border-rose-500/50"
                          : "bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent"
                      }`}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}

                  <div className="h-5 w-px bg-white/10 mx-1" />

                  <button
                    onClick={undoLast}
                    disabled={pageAnnotationCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs disabled:opacity-30 transition-colors"
                    title="Undo last"
                  >
                    <Undo2 size={13} />
                  </button>
                  <button
                    onClick={clearPage}
                    disabled={pageAnnotationCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs disabled:opacity-30 transition-colors"
                    title="Clear page annotations"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Options row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Colors */}
                  <div className="flex items-center gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          color === c ? "border-white scale-125" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="h-5 w-px bg-white/10" />

                  {(tool === "text") && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      Size
                      <input
                        type="number"
                        min={8}
                        max={72}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-rose-500"
                      />
                    </label>
                  )}

                  {(tool === "rectangle" || tool === "circle" || tool === "line" || tool === "freehand") && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      Width
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-rose-500"
                      />
                    </label>
                  )}

                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    Opacity
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(opacity * 100)}
                      onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                      className="w-16 accent-rose-500"
                    />
                    <span className="font-mono text-rose-300 w-8">{Math.round(opacity * 100)}%</span>
                  </label>

                  <div className="flex-1" />

                  <span className="text-xs text-slate-500">
                    {totalAnnotationCount} annotation{totalAnnotationCount !== 1 ? "s" : ""}
                    {pageAnnotationCount > 0 && ` (${pageAnnotationCount} on this page)`}
                  </span>
                </div>
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
                      <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                  <canvas ref={bgCanvasRef} className="absolute inset-0" />
                  <canvas
                    ref={overlayCanvasRef}
                    className={`absolute inset-0 ${
                      tool === "select" ? "cursor-default" : tool === "text" ? "cursor-text" : "cursor-crosshair"
                    }`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpWithEvent}
                    onMouseLeave={() => {
                      if (drawingRef.current) drawingRef.current = false;
                    }}
                  />
                  {/* Text input overlay */}
                  {textInput.visible && (
                    <div
                      className="absolute z-20"
                      style={{
                        left: `${textInput.x * 100}%`,
                        top: `${textInput.y * 100}%`,
                      }}
                    >
                      <input
                        ref={textInputRef}
                        type="text"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmText();
                          if (e.key === "Escape") setTextInput((p) => ({ ...p, visible: false }));
                        }}
                        onBlur={confirmText}
                        className="bg-white/90 border-2 border-rose-500 rounded px-2 py-1 text-sm outline-none text-black min-w-[120px]"
                        style={{ fontSize: `${fontSize}px`, color }}
                        placeholder="Type text..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {processing && <ProgressBar value={progress} label="Saving annotations..." />}
              {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              <button
                onClick={handleSave}
                disabled={processing || annotations.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Download size={16} />
                  {processing ? "Saving..." : `Save Annotated PDF (${totalAnnotationCount} annotations)`}
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
