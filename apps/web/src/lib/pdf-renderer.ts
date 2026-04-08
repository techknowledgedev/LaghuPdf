/**
 * pdf-renderer.ts — PDF.js wrapper for rendering pages to canvas/thumbnails.
 */
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

// Use the worker from the pdfjs-dist package via CDN or local copy
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pageNumber: number;
}

/**
 * Load a PDF document from an ArrayBuffer.
 */
export async function loadPdfDocument(
  buffer: ArrayBuffer
): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  return loadingTask.promise;
}

/**
 * Render a single page to a canvas at the given scale.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale = 1.0
): Promise<RenderedPage> {
  const page: PDFPageProxy = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();

  return {
    canvas,
    width: viewport.width,
    height: viewport.height,
    pageNumber,
  };
}

/**
 * Generate thumbnail data URLs for all pages.
 * thumbnailWidth controls the output size.
 */
export async function generateThumbnails(
  buffer: ArrayBuffer,
  thumbnailWidth = 150
): Promise<string[]> {
  const doc = await loadPdfDocument(buffer);
  const thumbnails: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = thumbnailWidth / viewport.width;
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = scaled.width;
    canvas.height = scaled.height;

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    page.cleanup();

    thumbnails.push(canvas.toDataURL("image/jpeg", 0.7));
  }

  doc.destroy();
  return thumbnails;
}

/**
 * Render all pages to image Blobs (for PDF-to-Image conversion).
 * Supports PNG, JPEG, and WebP (WebP falls back to PNG if browser doesn't support it).
 */
export async function renderAllPagesToBlobs(
  buffer: ArrayBuffer,
  dpi = 150,
  format: "image/png" | "image/jpeg" | "image/webp" = "image/png",
  quality = 0.92
): Promise<Blob[]> {
  const scale = dpi / 72; // PDF default is 72 DPI
  const doc = await loadPdfDocument(buffer);
  const blobs: Blob[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const rendered = await renderPage(doc, i, scale);
    const blob = await new Promise<Blob>((resolve, reject) => {
      rendered.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        format,
        quality
      );
    });
    blobs.push(blob);
  }

  doc.destroy();
  return blobs;
}
