import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { Upload, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxSizeMb?: number;
  className?: string;
  compact?: boolean;
}

export default function DropZone({
  onFiles,
  accept = { "application/pdf": [".pdf"] },
  multiple = false,
  maxSizeMb = 100,
  className,
  compact = false,
}: DropZoneProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const maxSize = maxSizeMb * 1024 * 1024;

  const onDrop = useCallback(
    (accepted: File[], rejected: { file: File; errors: readonly { code: string; message: string }[] }[]) => {
      setError(null);
      if (rejected.length > 0) {
        const err = rejected[0].errors[0];
        if (err.code === "file-too-large") {
          setError(`File too large. Max size: ${maxSizeMb} MB`);
        } else if (err.code === "file-invalid-type") {
          setError("Only PDF files are accepted.");
        } else {
          setError(err.message);
        }
        return;
      }
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles, maxSizeMb]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
  });

  if (compact) {
    return (
      <div className={cn("w-full", className)}>
        <div
          {...getRootProps()}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all",
            isDragActive && !isDragReject
              ? "border-indigo-400 bg-indigo-500/10"
              : isDragReject
                ? "border-red-400 bg-red-500/10"
                : "border-white/20 hover:border-indigo-400/50 hover:bg-white/5"
          )}
        >
          <input {...getInputProps()} />
          <FileText size={18} className="text-indigo-400 shrink-0" />
          <span className="text-sm text-slate-300">
            {isDragActive ? "Drop here…" : t("dropzone.browse")}
          </span>
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 min-h-[220px]",
          isDragActive && !isDragReject
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
            : isDragReject
              ? "border-red-400 bg-red-500/10"
              : "border-white/20 hover:border-indigo-400/60 hover:bg-white/5"
        )}
      >
        <input {...getInputProps()} />

        {/* Animated icon */}
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200",
            isDragActive
              ? "bg-indigo-500/30 scale-110"
              : "bg-indigo-500/10"
          )}
        >
          <Upload
            size={28}
            className={cn(
              "transition-colors",
              isDragActive ? "text-indigo-300" : "text-indigo-400"
            )}
          />
        </div>

        <div className="text-center">
          <p className="text-base font-medium text-slate-200">
            {isDragActive
              ? "Release to upload…"
              : isDragReject
                ? "Invalid file type"
                : t("dropzone.title")}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {t("dropzone.or")}{" "}
            <span className="text-indigo-400 hover:text-indigo-300">
              {t("dropzone.browse")}
            </span>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t("dropzone.hint", { maxSize: `${maxSizeMb} MB` })}
          </p>
          {multiple && (
            <p className="text-xs text-slate-500">
              {t("dropzone.multipleHint")}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-lg">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
