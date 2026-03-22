import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, ImageDown, ImagePlus, Download, X, GripVertical } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { imagesToPdf } from "@/lib/pdf-client";
import { renderAllPagesToBlobs } from "@/lib/pdf-renderer";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

type Mode = "pdf-to-image" | "image-to-pdf";
type ImageFormat = "png" | "jpeg" | "webp";

const FORMAT_MIME: Record<ImageFormat, "image/png" | "image/jpeg" | "image/webp"> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const FORMAT_EXT: Record<ImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

export default function ConvertPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) ?? "pdf-to-image"
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState(150);
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "original">("original");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // PDF→Image outputs
  const [imageOutputs, setImageOutputs] = useState<{ url: string; name: string; size: number }[]>([]);
  // Image→PDF output
  const [pdfOutput, setPdfOutput] = useState<{ url: string; name: string; size: number } | null>(null);

  useEffect(() => {
    const m = searchParams.get("mode") as Mode;
    if (m) setMode(m);
  }, [searchParams]);

  const onPdfFile = useCallback((files: File[]) => {
    setPdfFile(files[0]);
    setImageOutputs([]);
    setError(null);
  }, []);

  const onImageFiles = useCallback((files: File[]) => {
    setImageFiles((prev) => [...prev, ...files]);
    setPdfOutput(null);
    setError(null);
  }, []);

  const handlePdfToImage = async () => {
    if (!pdfFile) return;
    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const buf = await pdfFile.arrayBuffer();
      setProgress(20);
      const mime = FORMAT_MIME[format];
      const quality = format === "png" ? 1 : 0.9;
      const blobs = await renderAllPagesToBlobs(buf, dpi, mime, quality);
      setProgress(90);

      const ext = FORMAT_EXT[format];
      const outputs = blobs.map((blob, i) => {
        const url = URL.createObjectURL(blob);
        const name = pdfFile.name.replace(/\.pdf$/i, `_page${i + 1}.${ext}`);
        return { url, name, size: blob.size };
      });
      setImageOutputs(outputs);
      setProgress(100);
      toast.success(`Converted ${outputs.length} page${outputs.length !== 1 ? "s" : ""} to ${format.toUpperCase()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleImageToPdf = async () => {
    if (imageFiles.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const images = await Promise.all(
        imageFiles.map(async (f, i) => {
          setProgress(10 + Math.round((i / imageFiles.length) * 60));
          const buf = await f.arrayBuffer();
          const img = new Image();
          const url = URL.createObjectURL(new Blob([buf], { type: f.type }));
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.src = url;
          });
          URL.revokeObjectURL(url);
          return {
            buffer: buf,
            type: f.type as "image/jpeg" | "image/png",
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
        })
      );
      setProgress(75);
      const pdf = await imagesToPdf(images, pageSize);
      setProgress(90);
      const blob = arrayBufferToBlob(pdf.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      const name = generateOutputName(imageFiles[0].name, "_converted");
      setPdfOutput({ url, name: name.replace(/\.\w+$/, ".pdf"), size: blob.size });
      setProgress(100);
      toast.success("Images converted to PDF successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    imageOutputs.forEach(({ url, name }) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    });
  };

  const reset = () => {
    setPdfFile(null);
    setImageFiles([]);
    setImageOutputs([]);
    setPdfOutput(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
          <RefreshCw size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("convert.title")}</h1>
          <p className="text-sm text-slate-400">Browser-based conversion — no upload</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        {(["pdf-to-image", "image-to-pdf"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-teal-500/30 text-teal-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "pdf-to-image" ? <ImageDown size={14} /> : <ImagePlus size={14} />}
            {m === "pdf-to-image" ? t("convert.pdfToImage") : t("convert.imageToPdf")}
          </button>
        ))}
      </div>

      {mode === "pdf-to-image" && (
        <>
          {imageOutputs.length === 0 && (
            <>
              {!pdfFile ? (
                <DropZone onFiles={onPdfFile} />
              ) : (
                <div className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pdfFile.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(pdfFile.size)}</p>
                  </div>
                  <button onClick={() => setPdfFile(null)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
                </div>
              )}

              <div className="glass rounded-2xl p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t("convert.format")}</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="png">PNG (lossless)</option>
                    <option value="jpeg">JPEG (smaller)</option>
                    <option value="webp">WebP (modern, small)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t("convert.dpi")}</label>
                  <input
                    type="number"
                    min={72}
                    max={600}
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {processing && <ProgressBar value={progress} label={t("convert.converting")} />}
              {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              <button
                onClick={handlePdfToImage}
                disabled={!pdfFile || processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-white font-semibold text-sm transition-all"
              >
                {processing ? t("convert.converting") : t("convert.convert")}
              </button>
            </>
          )}

          {imageOutputs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-emerald-300">{imageOutputs.length} images ready</h2>
                <div className="flex gap-2">
                  <button onClick={downloadAll} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium">
                    <Download size={14} />Download all
                  </button>
                  <button onClick={reset} className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-sm">New</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageOutputs.map(({ url, name, size }) => (
                  <a key={url} href={url} download={name} className="group glass rounded-xl overflow-hidden border border-white/10 hover:border-teal-400/40 transition-all">
                    <img src={url} alt={name} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(size)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mode === "image-to-pdf" && (
        <>
          {!pdfOutput && (
            <>
              <DropZone
                onFiles={onImageFiles}
                accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }}
                multiple
                compact={imageFiles.length > 0}
              />

              {imageFiles.length > 0 && (
                <>
                  <div className="glass rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">{imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""} — drag to reorder</p>
                      <button onClick={() => setImageFiles([])} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear all</button>
                    </div>
                    {imageFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-2 py-1.5">
                        <GripVertical size={13} className="text-slate-600 shrink-0 cursor-grab" />
                        <span className="text-slate-500 w-5 text-right shrink-0 text-xs">{i + 1}</span>
                        <span className="flex-1 truncate text-slate-200">{f.name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{formatBytes(f.size)}</span>
                        <button
                          onClick={() => setImageFiles((p) => p.filter((_, j) => j !== i))}
                          aria-label={`Remove ${f.name}`}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t("convert.pageSize")}</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as "a4" | "letter" | "original")}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                    >
                      <option value="original">Original image size</option>
                      <option value="a4">A4</option>
                      <option value="letter">US Letter</option>
                    </select>
                  </div>
                </>
              )}

              {processing && <ProgressBar value={progress} label={t("convert.converting")} />}
              {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              <button
                onClick={handleImageToPdf}
                disabled={imageFiles.length === 0 || processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-400 hover:to-purple-400 disabled:opacity-50 text-white font-semibold text-sm transition-all"
              >
                {processing ? t("convert.converting") : t("convert.convert")}
              </button>
            </>
          )}

          {pdfOutput && (
            <OutputCard
              url={pdfOutput.url}
              filename={pdfOutput.name}
              outputSizeBytes={pdfOutput.size}
              onReset={reset}
            />
          )}
        </>
      )}
    </div>
  );
}
