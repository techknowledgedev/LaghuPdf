// ─── PDF Job Types ────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "processing" | "done" | "error";

export interface PdfJob {
  id: string;
  status: JobStatus;
  progress: number; // 0–100
  createdAt: number;
  completedAt?: number;
  error?: string;
  outputUrl?: string;
  inputSize?: number;
  outputSize?: number;
}

// ─── Compression ──────────────────────────────────────────────────────────────

export type CompressionPreset =
  | "/screen"
  | "/ebook"
  | "/printer"
  | "/prepress"
  | "/default";

export interface CompressionOptions {
  preset: CompressionPreset;
  colorDpi: number;
  grayDpi: number;
  monoDpi: number;
  jpegQuality: number; // 10–95
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  preset: "/ebook",
  colorDpi: 150,
  grayDpi: 150,
  monoDpi: 300,
  jpegQuality: 75,
};

export const COMPRESSION_PRESETS: Record<
  CompressionPreset,
  { label: string; description: string }
> = {
  "/screen": {
    label: "Screen (Smallest)",
    description: "Maximum compression, 72 DPI. Best for email and web viewing.",
  },
  "/ebook": {
    label: "eBook (Recommended)",
    description:
      "Balanced compression, 150 DPI. Good for reading on all devices.",
  },
  "/printer": {
    label: "Printer (High Quality)",
    description: "Moderate compression, 300 DPI. Suitable for home printing.",
  },
  "/prepress": {
    label: "Prepress (Professional)",
    description:
      "Minimal compression, 300+ DPI. For professional print production.",
  },
  "/default": {
    label: "Default (Minimal)",
    description:
      "Almost no compression, original quality preserved as much as possible.",
  },
};

// ─── Merge ────────────────────────────────────────────────────────────────────

export interface MergeOptions {
  files: string[]; // ordered list of file paths / blob URLs
  outputName?: string;
}

// ─── Split ────────────────────────────────────────────────────────────────────

export type SplitMode = "range" | "every" | "bookmarks" | "size";

export interface SplitRange {
  start: number; // 1-based page number
  end: number;
  outputName?: string;
}

export interface SplitOptions {
  mode: SplitMode;
  ranges?: SplitRange[];
  everyNPages?: number;
  maxSizeKb?: number;
}

// ─── Page Tools ───────────────────────────────────────────────────────────────

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface PageAction {
  type: "rotate" | "delete" | "reorder" | "extract";
  pageIndices: number[]; // 0-based
  rotation?: RotationDegrees;
  newOrder?: number[]; // for reorder — new index positions
}

// ─── Convert ─────────────────────────────────────────────────────────────────

export type ImageFormat = "png" | "jpeg" | "webp";

export interface PdfToImageOptions {
  format: ImageFormat;
  dpi: number;
  pages?: number[]; // 0-based, undefined = all pages
}

export interface ImageToPdfOptions {
  files: string[];
  pageSize?: "a4" | "letter" | "original";
  margin?: number; // points
}

// ─── File Info ────────────────────────────────────────────────────────────────

export interface PdfFileInfo {
  name: string;
  size: number; // bytes
  pageCount: number;
  url: string; // blob: or object URL
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";
export type Language =
  | "en"
  | "hi"
  | "es"
  | "fr"
  | "de"
  | "zh"
  | "ja"
  | "pt"
  | "ar"
  | "ru";

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  defaultOutputFolder?: string; // desktop only
  maxFileSizeMb: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en",
  maxFileSizeMb: 100,
};
