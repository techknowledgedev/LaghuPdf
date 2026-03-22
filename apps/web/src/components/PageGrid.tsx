/**
 * PageGrid — drag-to-reorder PDF page thumbnail grid using @dnd-kit.
 */
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCw, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageItem {
  id: string; // unique id (e.g., `page-${originalIndex}`)
  originalIndex: number;
  thumbnail: string; // data URL
  rotation: 0 | 90 | 180 | 270;
  deleted?: boolean;
}

interface SortablePageProps {
  item: PageItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  pageNumber: number;
  totalPages: number;
}

function SortablePage({
  item,
  selected,
  onToggleSelect,
  onRotate,
  onDelete,
  pageNumber,
  totalPages,
}: SortablePageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (item.deleted) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing select-none transition-all",
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : "border-white/10 hover:border-indigo-400/40"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail */}
      <div
        className="w-full bg-white"
        style={{ transform: `rotate(${item.rotation}deg)` }}
      >
        <img
          src={item.thumbnail}
          alt={`Page ${pageNumber}`}
          className="w-full h-auto object-contain"
          draggable={false}
        />
      </div>

      {/* Select overlay */}
      <button
        className={cn(
          "absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
          selected
            ? "bg-indigo-500 border-indigo-500"
            : "bg-black/50 border-white/30 opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(item.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {selected && <Check size={10} className="text-white" />}
      </button>

      {/* Action buttons (hover) */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-6 h-6 rounded-md bg-black/70 flex items-center justify-center hover:bg-indigo-500/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRotate(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Rotate 90°"
        >
          <RotateCw size={11} className="text-white" />
        </button>
        <button
          className="w-6 h-6 rounded-md bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Delete page"
        >
          <Trash2 size={11} className="text-white" />
        </button>
      </div>

      {/* Page number label */}
      <div className="absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-medium text-white bg-black/60 backdrop-blur-sm">
        {pageNumber} / {totalPages}
      </div>
    </div>
  );
}

interface PageGridProps {
  pages: PageItem[];
  selectedIds: Set<string>;
  onReorder: (newPages: PageItem[]) => void;
  onToggleSelect: (id: string) => void;
  onRotatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
}

export default function PageGrid({
  pages,
  selectedIds,
  onReorder,
  onToggleSelect,
  onRotatePage,
  onDeletePage,
}: PageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activePages = pages.filter((p) => !p.deleted);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    onReorder(arrayMove(pages, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={pages.map((p) => p.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {pages.map((item, visualIdx) => (
            <SortablePage
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onToggleSelect={onToggleSelect}
              onRotate={onRotatePage}
              onDelete={onDeletePage}
              pageNumber={visualIdx + 1}
              totalPages={activePages.length}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
