import { Download, CheckCircle, RotateCcw } from "lucide-react";
import { formatBytes, compressionSavings } from "@/lib/utils";
import { downloadBlob } from "@/lib/utils";

interface OutputCardProps {
  url: string;
  filename: string;
  outputSizeBytes: number;
  inputSizeBytes?: number;
  onReset: () => void;
}

export default function OutputCard({
  url,
  filename,
  outputSizeBytes,
  inputSizeBytes,
  onReset,
}: OutputCardProps) {
  const handleDownload = async () => {
    const res = await fetch(url);
    const blob = await res.blob();
    downloadBlob(blob, filename);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={20} className="text-emerald-400" />
        </div>
        <div>
          <p className="font-semibold text-emerald-300">Ready to download</p>
          <p className="text-sm text-slate-400 truncate max-w-xs">{filename}</p>
        </div>
      </div>

      {inputSizeBytes !== undefined && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-400">Original</p>
            <p className="font-mono text-sm font-semibold text-slate-200">
              {formatBytes(inputSizeBytes)}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-400">Result</p>
            <p className="font-mono text-sm font-semibold text-slate-200">
              {formatBytes(outputSizeBytes)}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-400">Saved</p>
            <p
              className={`font-mono text-sm font-semibold ${
                outputSizeBytes < inputSizeBytes
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {compressionSavings(inputSizeBytes, outputSizeBytes)}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
        >
          <Download size={16} />
          Download
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-medium text-sm transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          New
        </button>
      </div>
    </div>
  );
}
