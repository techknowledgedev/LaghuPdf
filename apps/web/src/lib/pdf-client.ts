/**
 * pdf-client.ts — Browser-side PDF operations via pdf-lib.
 * All functions run entirely in the browser — no server upload needed.
 */
import {
  PDFDocument,
  degrees,
  PageSizes,
  PDFPage,
} from "pdf-lib";
import type { RotationDegrees, SplitRange } from "@pdftwist/shared";

// ─── Utilities ────────────────────────────────────────────────────────────────

async function loadDoc(source: ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(source, { ignoreEncryption: false });
}

export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  const doc = await loadDoc(buffer);
  return doc.getPageCount();
}

export async function getPdfInfo(buffer: ArrayBuffer): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}> {
  const doc = await loadDoc(buffer);
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    creationDate: doc.getCreationDate() ?? undefined,
  };
}

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merges multiple PDF ArrayBuffers into a single PDF.
 * Preserves page order as provided.
 */
export async function mergePdfs(
  buffers: ArrayBuffer[]
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const doc = await loadDoc(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

// ─── Split ────────────────────────────────────────────────────────────────────

/**
 * Splits a PDF by page ranges.
 * Returns one Uint8Array per range.
 */
export async function splitPdfByRanges(
  buffer: ArrayBuffer,
  ranges: SplitRange[]
): Promise<Uint8Array[]> {
  const source = await loadDoc(buffer);
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const out = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = range.start - 1; i < range.end; i++) indices.push(i);
    const pages = await out.copyPages(source, indices);
    pages.forEach((p) => out.addPage(p));
    results.push(await out.save());
  }
  return results;
}

/**
 * Splits a PDF every N pages.
 */
export async function splitPdfEveryNPages(
  buffer: ArrayBuffer,
  n: number
): Promise<Uint8Array[]> {
  const source = await loadDoc(buffer);
  const total = source.getPageCount();
  const ranges: SplitRange[] = [];
  for (let start = 1; start <= total; start += n) {
    ranges.push({ start, end: Math.min(start + n - 1, total) });
  }
  return splitPdfByRanges(buffer, ranges);
}

// ─── Rotate ───────────────────────────────────────────────────────────────────

/**
 * Rotates the specified pages (0-based indices) by the given degrees.
 * Returns a new PDF with the rotation applied.
 */
export async function rotatePdfPages(
  buffer: ArrayBuffer,
  pageIndices: number[],
  rotation: RotationDegrees
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const indexSet = new Set(pageIndices);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    if (indexSet.has(i)) {
      const current = page.getRotation().angle as RotationDegrees;
      const next = ((current + rotation) % 360) as RotationDegrees;
      page.setRotation(degrees(next));
    }
  });
  return doc.save();
}

/**
 * Rotates ALL pages by the given degrees.
 */
export async function rotateAllPages(
  buffer: ArrayBuffer,
  rotation: RotationDegrees
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  doc.getPages().forEach((page) => {
    const current = page.getRotation().angle as RotationDegrees;
    const next = ((current + rotation) % 360) as RotationDegrees;
    page.setRotation(degrees(next));
  });
  return doc.save();
}

// ─── Delete Pages ─────────────────────────────────────────────────────────────

/**
 * Removes the specified pages (0-based indices) and returns the new PDF.
 */
export async function deletePdfPages(
  buffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const source = await loadDoc(buffer);
  const total = source.getPageCount();
  const deleteSet = new Set(pageIndices);
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !deleteSet.has(i)
  );
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, keepIndices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// ─── Reorder Pages ────────────────────────────────────────────────────────────

/**
 * Reorders pages. newOrder is an array of original 0-based indices in
 * their desired new order. e.g. [2, 0, 1] puts page 3 first.
 */
export async function reorderPdfPages(
  buffer: ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const source = await loadDoc(buffer);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, newOrder);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// ─── Extract Pages ────────────────────────────────────────────────────────────

/**
 * Extracts specific pages into a new PDF.
 */
export async function extractPdfPages(
  buffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const source = await loadDoc(buffer);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, pageIndices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// ─── Images to PDF ────────────────────────────────────────────────────────────

type PageSizeKey = "a4" | "letter" | "original";

const PAGE_SIZE_MAP: Record<PageSizeKey, [number, number] | null> = {
  a4: PageSizes.A4,
  letter: PageSizes.Letter,
  original: null,
};

/**
 * Combines image files (JPEG or PNG) into a single PDF.
 */
export async function imagesToPdf(
  images: { buffer: ArrayBuffer; type: "image/jpeg" | "image/png"; width: number; height: number }[],
  pageSize: PageSizeKey = "original",
  margin = 0
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded =
      img.type === "image/jpeg"
        ? await doc.embedJpg(img.buffer)
        : await doc.embedPng(img.buffer);

    const targetSize = PAGE_SIZE_MAP[pageSize];
    let w: number, h: number;
    if (targetSize) {
      w = targetSize[0] - margin * 2;
      h = targetSize[1] - margin * 2;
    } else {
      w = img.width;
      h = img.height;
    }

    const scale = Math.min(w / img.width, h / img.height);
    const finalW = img.width * scale;
    const finalH = img.height * scale;

    const pageW = targetSize ? targetSize[0] : finalW + margin * 2;
    const pageH = targetSize ? targetSize[1] : finalH + margin * 2;

    const page = doc.addPage([pageW, pageH] as [number, number]);
    page.drawImage(embedded, {
      x: (pageW - finalW) / 2,
      y: (pageH - finalH) / 2,
      width: finalW,
      height: finalH,
    });
  }
  return doc.save();
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
}

export async function setPdfMetadata(
  buffer: ArrayBuffer,
  meta: PdfMetadata
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords([meta.keywords]);
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  return doc.save();
}
