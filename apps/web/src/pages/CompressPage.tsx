import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FileArchive, Info } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { compressPdf } from "@/lib/api-client";
import { downloadBlob, formatBytes, generateOutputName } from "@/lib/utils";
import {
  COMPRESSION_PRESETS,
  DEFAULT_COMPRESSION_OPTIONS,
  type CompressionPreset,
  type CompressionOptions,
} from "@pdftwist/shared";

export default function CompressPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<CompressionOptions>(DEFAULT_COMPRESSION_OPTIONS);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    url: string;
    name: string;
    inputSize: number;
    outputSize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setError(null);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const res = await compressPdf(
        {
          file,
          preset: options.preset,
          colorDpi: options.colorDpi,
          grayDpi: options.grayDpi,
          monoDpi: options.monoDpi,
          jpegQuality: options.jpegQuality,
        },
        (pct) => setProgress(pct)
      );
      setProgress(100);
      setResult({
        url: res.downloadUrl,
        name: generateOutputName(file.name, "_compressed"),
        inputSize: res.originalSize,
        outputSize: res.compressedSize,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const set = <K extends keyof CompressionOptions>(
    key: K,
    value: CompressionOptions[K]
  ) => setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
          <FileArchive size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("compress.title")}</h1>
          <p className="text-sm text-slate-400">
            Powered by Ghostscript — industry-standard compression
          </p>
        </div>
      </div>

      {!result && (
        <>
          {/* Drop zone */}
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <FileArchive size={20} className="text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          )}

          {/* Options */}
          <div className="glass rounded-2xl p-5 space-y-5">
            {/* Preset selector */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {t("compress.preset")}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.entries(COMPRESSION_PRESETS) as [CompressionPreset, { label: string; description: string }][]).map(
                  ([key, { label, description }]) => (
                    <button
                      key={key}
                      onClick={() => set("preset", key)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        options.preset === key
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                          options.preset === key
                            ? "border-indigo-500"
                            : "border-white/30"
                        }`}
                      >
                        {options.preset === key && (
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* DPI controls */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["colorDpi", t("compress.colorDpi")],
                  ["grayDpi", t("compress.grayDpi")],
                  ["monoDpi", t("compress.monoDpi")],
                ] as [keyof CompressionOptions, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={options[key] as number}
                    onChange={(e) =>
                      set(key, Math.max(36, Math.min(600, Number(e.target.value))))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    min={36}
                    max={600}
                  />
                </div>
              ))}
            </div>

            {/* JPEG Quality */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  {t("compress.jpegQuality")}
                </label>
                <span className="text-sm font-mono text-indigo-300">
                  {options.jpegQuality}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={options.jpegQuality}
                onChange={(e) => set("jpegQuality", Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-white/5 rounded-xl px-4 py-3">
            <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
            Compression is handled server-side via Ghostscript. Your file is
            auto-deleted within 30 minutes of processing.
          </div>

          {/* Progress */}
          {processing && (
            <ProgressBar value={progress} label={t("compress.compressing")} />
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Action */}
          <button
            onClick={handleCompress}
            disabled={!file || processing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing ? t("compress.compressing") : t("compress.compress")}
          </button>
        </>
      )}

      {result && (
        <OutputCard
          url={result.url}
          filename={result.name}
          outputSizeBytes={result.outputSize}
          inputSizeBytes={result.inputSize}
          onReset={reset}
        />
      )}
    </div>
  );
}
