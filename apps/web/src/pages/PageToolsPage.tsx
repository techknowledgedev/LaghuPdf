import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid,
  RotateCw,
  RotateCcw,
  Trash2,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import PageGrid, { type PageItem } from "@/components/PageGrid";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import {
  rotatePdfPages,
  deletePdfPages,
  reorderPdfPages,
} from "@/lib/pdf-client";
import { generateThumbnails } from "@/lib/pdf-renderer";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import type { RotationDegrees } from "@pdftwist/shared";

export default function PageToolsPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setSelectedIds(new Set());
    setLoading(true);

    try {
      const buf = await f.arrayBuffer();
      setFileBuffer(buf);
      const thumbnails = await generateThumbnails(buf, 180);
      setPages(
        thumbnails.map((thumb, i) => ({
          id: `page-${i}`,
          originalIndex: i,
          thumbnail: thumb,
          rotation: 0,
        }))
      );
    } catch {
      setError("Failed to load PDF.");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelectedIds(new Set(pages.filter((p) => !p.deleted).map((p) => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const rotatePage = (id: string) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, rotation: (((p.rotation + 90) % 360) as RotationDegrees) }
          : p
      )
    );

  const deletePageItem = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, deleted: true } : p))
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rotateSelected = (deg: RotationDegrees) =>
    setPages((prev) =>
      prev.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, rotation: (((p.rotation + deg) % 360) as RotationDegrees) }
          : p
      )
    );

  const deleteSelected = () => {
    setPages((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, deleted: true } : p))
    );
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    if (!fileBuffer) return;
    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const activePagesOrdered = pages.filter((p) => !p.deleted);
      let buf = fileBuffer;

      // 1. Reorder
      setProgress(25);
      buf = (await reorderPdfPages(buf, activePagesOrdered.map((p) => p.originalIndex))).buffer as ArrayBuffer;

      // 2. Rotate pages that need it
      setProgress(50);
      const rotations = activePagesOrdered.reduce<
        { idx: number; deg: RotationDegrees }[]
      >((acc, p, newIdx) => {
        if (p.rotation !== 0) acc.push({ idx: newIdx, deg: p.rotation });
        return acc;
      }, []);

      for (const { idx, deg } of rotations) {
        buf = (await rotatePdfPages(buf, [idx], deg)).buffer as ArrayBuffer;
      }

      setProgress(85);
      const blob = arrayBufferToBlob(buf);
      const url = URL.createObjectURL(blob);
      const name = generateOutputName(file!.name, "_edited");
      setResult({ url, name, size: blob.size });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setPages([]);
    setResult(null);
    setProgress(0);
    setSelectedIds(new Set());
  };

  const activeCount = pages.filter((p) => !p.deleted).length;
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <LayoutGrid size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("pageTools.title")}</h1>
          <p className="text-sm text-slate-400">
            Drag to reorder • Click thumbnails to select • No upload
          </p>
        </div>
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : loading ? (
            <div className="text-center py-16 text-slate-400">
              Generating thumbnails…
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-slate-400 mr-2">
                  {activeCount} pages
                  {selectedCount > 0 && (
                    <span className="text-indigo-300">• {selectedCount} selected</span>
                  )}
                </div>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                <button
                  onClick={selectedCount === activeCount ? deselectAll : selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors"
                >
                  {selectedCount === activeCount ? (
                    <CheckSquare size={13} />
                  ) : (
                    <Square size={13} />
                  )}
                  {selectedCount === activeCount ? "Deselect all" : "Select all"}
                </button>

                {selectedCount > 0 && (
                  <>
                    <button
                      onClick={() => rotateSelected(90)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
                    >
                      <RotateCw size={13} />
                      90°
                    </button>
                    <button
                      onClick={() => rotateSelected(270)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
                    >
                      <RotateCcw size={13} />
                      -90°
                    </button>
                    <button
                      onClick={() => rotateSelected(180)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
                    >
                      <RotateCw size={13} />
                      180°
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-xs font-medium text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </>
                )}

                <div className="flex-1" />

                <button
                  onClick={handleSave}
                  disabled={processing || activeCount === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  <Download size={13} />
                  {processing ? t("pageTools.saving") : t("pageTools.save")}
                </button>
              </div>

              {/* Page grid */}
              <PageGrid
                pages={pages}
                selectedIds={selectedIds}
                onReorder={setPages}
                onToggleSelect={toggleSelect}
                onRotatePage={rotatePage}
                onDeletePage={deletePageItem}
              />

              {processing && (
                <ProgressBar value={progress} label={t("pageTools.saving")} />
              )}
              {error && (
                <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
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
