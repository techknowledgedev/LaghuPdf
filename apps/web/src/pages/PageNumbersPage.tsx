import { useState, useCallback } from "react";
import { Hash } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { addPageNumbers, getPdfPageCount, type PageNumberOptions } from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

type NumberFormat = "numeric" | "roman" | "withTotal";
type NumberPosition = PageNumberOptions["position"];

const POSITIONS: { value: NumberPosition; label: string }[] = [
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "top-center", label: "Top Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
];

const FORMATS: { value: NumberFormat; label: string; example: string }[] = [
  { value: "numeric", label: "Numeric", example: "1, 2, 3..." },
  { value: "roman", label: "Roman", example: "i, ii, iii..." },
  { value: "withTotal", label: "With total", example: "1 / 10, 2 / 10..." },
];

export default function PageNumbersPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState<NumberFormat>("numeric");
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [fontSize, setFontSize] = useState(10);
  const [startNumber, setStartNumber] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [margin, setMargin] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    const buf = await f.arrayBuffer();
    setPageCount(await getPdfPageCount(buf));
  }, []);

  const handleAdd = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      const buf = await file.arrayBuffer();
      setProgress(50);
      const output = await addPageNumbers(buf, {
        format,
        position,
        fontSize,
        startNumber,
        prefix: prefix || undefined,
        margin,
        color: { r: 0.3, g: 0.3, b: 0.3 },
      });
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file.name, "_numbered"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Page numbers added successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add page numbers.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setPageCount(0);
  };

  // Preview string
  const previewLabel = (() => {
    const p = prefix || "";
    switch (format) {
      case "numeric": return `${p}${startNumber}`;
      case "roman": return `${p}i`;
      case "withTotal": return `${p}${startNumber} / ${pageCount || "?"}`;
    }
  })();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
          <Hash size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Page Numbers</h1>
          <p className="text-sm text-slate-400">Add page numbers to every page — processed in your browser</p>
        </div>
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <Hash size={20} className="text-sky-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)} • {pageCount} pages</p>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
            </div>
          )}

          {file && (
            <div className="glass rounded-2xl p-5 space-y-5">
              {/* Preview */}
              <div className="text-center py-3 bg-white/5 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Preview</p>
                <p className="font-mono text-lg text-sky-300">{previewLabel}</p>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Number format</label>
                <div className="flex gap-2">
                  {FORMATS.map(({ value, label, example }) => (
                    <button
                      key={value}
                      onClick={() => setFormat(value)}
                      className={`flex-1 px-3 py-2 rounded-xl text-center border transition-all ${
                        format === value
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{example}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  {POSITIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPosition(value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        position === value
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Font size</label>
                  <input
                    type="number"
                    min={6}
                    max={36}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start number</label>
                  <input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Margin (pt)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Prefix */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Prefix (optional)</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder='e.g. "Page ", "- "'
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {processing && <ProgressBar value={progress} label="Adding page numbers..." />}
          {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

          <button
            onClick={handleAdd}
            disabled={!file || processing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing ? "Adding page numbers..." : "Add Page Numbers"}
          </button>
        </>
      )}

      {result && (
        <OutputCard
          url={result.url}
          filename={result.name}
          outputSizeBytes={result.size}
          inputSizeBytes={file?.size}
          onReset={reset}
        />
      )}
    </div>
  );
}
