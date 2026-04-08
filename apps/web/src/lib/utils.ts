import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function compressionSavings(original: number, compressed: number): string {
  if (original === 0) return "0%";
  const saved = ((original - compressed) / original) * 100;
  return `${saved >= 0 ? "-" : "+"}${Math.abs(saved).toFixed(1)}%`;
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

export function arrayBufferToBlob(
  buffer: ArrayBuffer,
  type = "application/pdf"
): Blob {
  return new Blob([buffer], { type });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function generateOutputName(
  inputName: string,
  suffix: string
): string {
  const base = inputName.replace(/\.pdf$/i, "");
  return `${base}${suffix}.pdf`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
