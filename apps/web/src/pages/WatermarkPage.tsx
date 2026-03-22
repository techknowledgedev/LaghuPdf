import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Stamp, Type, ImagePlus } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import {
  addTextWatermark,
  addImageWatermark,
  getPdfPageCount,
  type TextWatermarkOptions,
  type ImageWatermarkOptions,
} from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

type PageScope = "all" | "odd" | "even" | "first" | "last" | "custom";

function computePages(scope: PageScope, total: number, custom: string): number[] | undefined {
  switch (scope) {
    case "all": return undefined;
    case "odd": return Array.from({ length: Math.ceil(total / 2) }, (_, i) => i * 2);
    case "even": return Array.from({ length: Math.floor(total / 2) }, (_, i) => i * 2 + 1);
    case "first": return [0];
    case "last": return [total - 1];
    case "custom": {
      const indices: number[] = [];
      for (const part of custom.split(",").map((s) => s.trim())) {
        const m = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (m) {
          for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) {
            if (i >= 1 && i <= total) indices.push(i - 1);
          }
        } else {
          const n = parseInt(part);
          if (!isNaN(n) && n >= 1 && n <= total) indices.push(n - 1);
        }
      }
      return [...new Set(indices)].sort((a, b) => a - b);
    }
  }
}

type WatermarkMode = "text" | "image";
type Position = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

const COLOR_PRESETS = [
  { label: "Gray", r: 0.5, g: 0.5, b: 0.5 },
  { label: "Red", r: 0.8, g: 0.1, b: 0.1 },
  { label: "Blue", r: 0.1, g: 0.1, b: 0.8 },
  { label: "Black", r: 0, g: 0, b: 0 },
  { label: "Green", r: 0.1, g: 0.6, b: 0.1 },
];

export default function WatermarkPage() {
  const toast = useToast();
  const { t } = useTranslation();
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Page scope
  const [pageScope, setPageScope] = useState<PageScope>("all");
  const [customPages, setCustomPages] = useState("");

  // Text watermark options
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [position, setPosition] = useState<Position>("center");

  // Image watermark options
  const [imageScale, setImageScale] = useState(0.3);
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [imagePosition, setImagePosition] = useState<Position>("center");

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPdfFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setPdfFile(f);
    setResult(null);
    setError(null);
    try {
      const buf = await f.arrayBuffer();
      const count = await getPdfPageCount(buf);
      setPageCount(count);
      setCustomPages(`1-${count}`);
    } catch {
      setPageCount(0);
    }
  }, []);

  const onImageFiles = useCallback((files: File[]) => {
    setImageFile(files[0]);
  }, []);

  const handleTextWatermark = async () => {
    if (!pdfFile || !text) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      const buf = await pdfFile.arrayBuffer();
      setProgress(40);
      const pages = computePages(pageScope, pageCount, customPages);
      const output = await addTextWatermark(buf, {
        text,
        fontSize,
        opacity,
        rotation,
        color: { r: color.r, g: color.g, b: color.b },
        position,
        pages,
      });
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(pdfFile.name, "_watermarked"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Watermark added successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add watermark.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleImageWatermark = async () => {
    if (!pdfFile || !imageFile) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      const pdfBuf = await pdfFile.arrayBuffer();
      const imgBuf = await imageFile.arrayBuffer();
      setProgress(40);
      const pages = computePages(pageScope, pageCount, customPages);
      const output = await addImageWatermark(pdfBuf, {
        imageBuffer: imgBuf,
        imageType: imageFile.type as "image/png" | "image/jpeg",
        scale: imageScale,
        opacity: imageOpacity,
        position: imagePosition,
        pages,
      });
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(pdfFile.name, "_watermarked"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Watermark added successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add watermark.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setPdfFile(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Stamp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Watermark</h1>
          <p className="text-sm text-slate-400">Add text or image watermarks — processed in your browser</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => { setMode("text"); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "text" ? "bg-orange-500/30 text-orange-200" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Type size={14} /> Text Watermark
        </button>
        <button
          onClick={() => { setMode("image"); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "image" ? "bg-orange-500/30 text-orange-200" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImagePlus size={14} /> Image Watermark
        </button>
      </div>

      {!result && (
        <>
          {/* PDF input */}
          {!pdfFile ? (
            <DropZone onFiles={onPdfFiles} />
          ) : (
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <Stamp size={20} className="text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{pdfFile.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(pdfFile.size)}</p>
              </div>
              <button onClick={() => setPdfFile(null)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
            </div>
          )}

          {pdfFile && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <label className="text-xs text-slate-400 block">Apply to pages</label>
              <div className="flex flex-wrap gap-2">
                {(["all", "odd", "even", "first", "last", "custom"] as PageScope[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPageScope(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                      pageScope === s
                        ? "border-orange-500 bg-orange-500/20 text-orange-200"
                        : "border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    {s === "all" ? `All ${pageCount > 0 ? `(${pageCount})` : "pages"}` : s === "custom" ? "Custom range" : s}
                  </button>
                ))}
              </div>
              {pageScope === "custom" && (
                <input
                  type="text"
                  value={customPages}
                  onChange={(e) => setCustomPages(e.target.value)}
                  placeholder="e.g. 1, 3, 5-7"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
                />
              )}
            </div>
          )}

          {pdfFile && mode === "text" && (
            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Text input */}
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Watermark text</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY"
                />
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Font size</label>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Rotation ({rotation} deg)</label>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-orange-500 mt-1"
                  />
                </div>
              </div>

              {/* Opacity */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Opacity</label>
                  <span className="text-xs font-mono text-orange-300">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Color</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setColor(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        color.label === c.label
                          ? "border-orange-500 bg-orange-500/20 text-orange-200"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})` }}
                      />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Position</label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPosition(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        position === value
                          ? "border-orange-500 bg-orange-500/20 text-orange-200"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {pdfFile && mode === "image" && (
            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Image input */}
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Watermark image</label>
                {!imageFile ? (
                  <DropZone
                    onFiles={onImageFiles}
                    accept={{ "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }}
                    compact
                  />
                ) : (
                  <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-sm truncate flex-1">{imageFile.name}</span>
                    <button onClick={() => setImageFile(null)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
                  </div>
                )}
              </div>

              {/* Scale */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Image scale (% of page width)</label>
                  <span className="text-xs font-mono text-orange-300">{Math.round(imageScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(imageScale * 100)}
                  onChange={(e) => setImageScale(Number(e.target.value) / 100)}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Opacity</label>
                  <span className="text-xs font-mono text-orange-300">{Math.round(imageOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(imageOpacity * 100)}
                  onChange={(e) => setImageOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Position</label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setImagePosition(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        imagePosition === value
                          ? "border-orange-500 bg-orange-500/20 text-orange-200"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {processing && <ProgressBar value={progress} label="Adding watermark..." />}
          {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

          <button
            onClick={mode === "text" ? handleTextWatermark : handleImageWatermark}
            disabled={!pdfFile || processing || (mode === "text" && !text) || (mode === "image" && !imageFile)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing ? "Adding watermark..." : "Add Watermark"}
          </button>
        </>
      )}

      {result && (
        <OutputCard
          url={result.url}
          filename={result.name}
          outputSizeBytes={result.size}
          inputSizeBytes={pdfFile?.size}
          onReset={reset}
        />
      )}
    </div>
  );
}
