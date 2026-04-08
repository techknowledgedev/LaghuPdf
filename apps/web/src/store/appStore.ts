import { create } from "zustand";
import type { PdfFileInfo } from "@pdftwist/shared";

interface AppState {
  // Currently loaded files in any tool context
  files: PdfFileInfo[];
  setFiles: (files: PdfFileInfo[]) => void;
  addFile: (file: PdfFileInfo) => void;
  removeFile: (name: string) => void;
  clearFiles: () => void;

  // Processing state
  isProcessing: boolean;
  progress: number;
  setProcessing: (val: boolean) => void;
  setProgress: (val: number) => void;

  // Last output (download URL)
  outputUrl: string | null;
  outputName: string | null;
  outputSizeBytes: number | null;
  setOutput: (url: string, name: string, sizeBytes: number) => void;
  clearOutput: () => void;

  // Error
  error: string | null;
  setError: (msg: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  files: [],
  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  removeFile: (name) =>
    set((s) => ({ files: s.files.filter((f) => f.name !== name) })),
  clearFiles: () => set({ files: [] }),

  isProcessing: false,
  progress: 0,
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),

  outputUrl: null,
  outputName: null,
  outputSizeBytes: null,
  setOutput: (outputUrl, outputName, outputSizeBytes) =>
    set({ outputUrl, outputName, outputSizeBytes }),
  clearOutput: () =>
    set({ outputUrl: null, outputName: null, outputSizeBytes: null }),

  error: null,
  setError: (error) => set({ error }),
}));
