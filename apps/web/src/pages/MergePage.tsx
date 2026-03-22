import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GitMerge, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { mergePdfs } from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, downloadBlob, generateOutputName } from "@/lib/utils";

interface FileItem {
  id: string;
  file: File;
}

function SortableFile({
  item,
  onRemove,
}: {
  item: FileItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 glass rounded-xl px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-slate-400">{formatBytes(item.file.size)}</p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-slate-500 hover:text-red-400 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function MergePage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FileItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onFiles = useCallback((files: File[]) => {
    setItems((prev) => [
      ...prev,
      ...files.map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f })),
    ]);
    setResult(null);
    setError(null);
  }, []);

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  };

  const handleMerge = async () => {
    if (items.length < 2) return;
    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const buffers = await Promise.all(
        items.map((item, i) => {
          setProgress(10 + Math.round((i / items.length) * 60));
          return item.file.arrayBuffer();
        })
      );
      setProgress(70);
      const merged = await mergePdfs(buffers);
      setProgress(95);
      const blob = arrayBufferToBlob(merged.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      const name = generateOutputName(items[0].file.name, "_merged");
      setResult({ url, name, size: blob.size });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setItems([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const totalInputSize = items.reduce((s, i) => s + i.file.size, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <GitMerge size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("merge.title")}</h1>
          <p className="text-sm text-slate-400">Processed entirely in your browser — no upload</p>
        </div>
      </div>

      {!result && (
        <>
          {/* File list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-slate-400">
                  {items.length} file{items.length !== 1 ? "s" : ""} •{" "}
                  {formatBytes(totalInputSize)} total
                </p>
                <p className="text-xs text-slate-500">{t("merge.fileOrder")}</p>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <SortableFile key={item.id} item={item} onRemove={removeItem} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Drop zone */}
          <DropZone
            onFiles={onFiles}
            multiple
            compact={items.length > 0}
          />

          {processing && <ProgressBar value={progress} label={t("merge.merging")} />}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            onClick={handleMerge}
            disabled={items.length < 2 || processing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing ? t("merge.merging") : `${t("merge.merge")} ${items.length} files`}
          </button>
          {items.length < 2 && (
            <p className="text-center text-xs text-slate-500">Add at least 2 PDF files to merge</p>
          )}
        </>
      )}

      {result && (
        <OutputCard
          url={result.url}
          filename={result.name}
          outputSizeBytes={result.size}
          inputSizeBytes={totalInputSize}
          onReset={reset}
        />
      )}
    </div>
  );
}
