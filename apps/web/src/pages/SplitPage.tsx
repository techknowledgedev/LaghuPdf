import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Scissors, Plus, X, Download } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import { splitPdfByRanges, splitPdfEveryNPages, getPdfPageCount } from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, downloadBlob, generateOutputName } from "@/lib/utils";
import type { SplitRange, SplitMode } from "@pdftwist/shared";

interface RangeEntry extends SplitRange {
  id: string;
}

export default function SplitPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>("range");
  const [ranges, setRanges] = useState<RangeEntry[]>([
    { id: "1", start: 1, end: 1 },
  ]);
  const [everyN, setEveryN] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputs, setOutputs] = useState<{ name: string; url: string; size: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setOutputs([]);
    setError(null);
    const buf = await f.arrayBuffer();
    const count = await getPdfPageCount(buf);
    setPageCount(count);
    setRanges([{ id: "1", start: 1, end: count }]);
  }, []);

  const addRange = () =>
    setRanges((prev) => [
      ...prev,
      { id: String(Date.now()), start: 1, end: pageCount },
    ]);

  const removeRange = (id: string) =>
    setRanges((prev) => prev.filter((r) => r.id !== id));

  const updateRange = (id: string, key: "start" | "end", val: number) =>
    setRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: val } : r))
    );

  const handleSplit = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const buf = await file.arrayBuffer();
      setProgress(30);

      let parts: Uint8Array[];
      if (mode === "range") {
        parts = await splitPdfByRanges(buf, ranges);
      } else {
        parts = await splitPdfEveryNPages(buf, everyN);
      }
      setProgress(80);

      const results = parts.map((part, i) => {
        const blob = arrayBufferToBlob(part.buffer as ArrayBuffer);
        const url = URL.createObjectURL(blob);
        const name = generateOutputName(
          file.name,
          mode === "range"
            ? `_p${ranges[i]?.start}-${ranges[i]?.end}`
            : `_part${i + 1}`
        );
        return { name, url, size: blob.size };
      });

      setOutputs(results);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    outputs.forEach(({ url, name }) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    });
  };

  const reset = () => {
    setFile(null);
    setOutputs([]);
    setProgress(0);
    setPageCount(0);
  };

  const modes: { key: SplitMode; label: string }[] = [
    { key: "range", label: t("split.mode.range") },
    { key: "every", label: t("split.mode.every") },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Scissors size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("split.title")}</h1>
          <p className="text-sm text-slate-400">
            Processed entirely in your browser — no upload
          </p>
        </div>
      </div>

      {outputs.length === 0 && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <Scissors size={20} className="text-pink-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} • {pageCount} pages
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          )}

          {file && (
            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-2 bg-white/5 rounded-xl p-1">
                {modes.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === key
                        ? "bg-pink-500/30 text-pink-200"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "range" && (
                <div className="space-y-2">
                  {ranges.map((range) => (
                    <div key={range.id} className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 block mb-1">
                            From page
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={range.start}
                            onChange={(e) =>
                              updateRange(range.id, "start", Number(e.target.value))
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-pink-500"
                          />
                        </div>
                        <span className="text-slate-500 mt-5">–</span>
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 block mb-1">
                            To page
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={range.end}
                            onChange={(e) =>
                              updateRange(range.id, "end", Number(e.target.value))
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>
                      {ranges.length > 1 && (
                        <button
                          onClick={() => removeRange(range.id)}
                          className="text-slate-500 hover:text-red-400 mt-5 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRange}
                    className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <Plus size={14} />
                    {t("split.addRange")}
                  </button>
                </div>
              )}

              {mode === "every" && (
                <div>
                  <label className="text-sm text-slate-300 block mb-2">
                    Split every{" "}
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={everyN}
                      onChange={(e) => setEveryN(Number(e.target.value))}
                      className="inline-block w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm font-mono mx-1 focus:outline-none focus:border-pink-500"
                    />{" "}
                    page{everyN !== 1 ? "s" : ""}
                  </label>
                  <p className="text-xs text-slate-500">
                    Will produce {Math.ceil(pageCount / everyN)} file
                    {Math.ceil(pageCount / everyN) !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {processing && <ProgressBar value={progress} label={t("split.splitting")} />}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSplit}
            disabled={!file || processing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing ? t("split.splitting") : t("split.split")}
          </button>
        </>
      )}

      {outputs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-emerald-300">
              {outputs.length} file{outputs.length !== 1 ? "s" : ""} ready
            </h2>
            <div className="flex gap-2">
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
              >
                <Download size={14} />
                Download all
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-sm transition-colors"
              >
                New
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {outputs.map(({ name, url, size }) => (
              <div
                key={url}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(size)}</p>
                </div>
                <a
                  href={url}
                  download={name}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Download size={13} />
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
