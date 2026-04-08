/**
 * pdf-client.ts — Browser-side PDF operations via pdf-lib.
 * All functions run entirely in the browser — no server upload needed.
 */
import {
  PDFDocument,
  degrees,
  PageSizes,
  PDFPage,
  rgb,
  StandardFonts,
  PDFFont,
  grayscale,
  LineCapStyle,
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

export async function getPdfMetadata(
  buffer: ArrayBuffer
): Promise<PdfMetadata & { pageCount: number; producer?: string; creationDate?: string; modificationDate?: string }> {
  const doc = await loadDoc(buffer);
  return {
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    keywords: doc.getKeywords() ?? undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
    creationDate: doc.getCreationDate()?.toISOString() ?? undefined,
    modificationDate: doc.getModificationDate()?.toISOString() ?? undefined,
    pageCount: doc.getPageCount(),
  };
}

// ─── Password Protect ─────────────────────────────────────────────────────────

export interface ProtectOptions {
  userPassword: string;
  ownerPassword: string;
  permissions?: {
    printing?: boolean;
    copying?: boolean;
    modifying?: boolean;
  };
}

/**
 * Encrypts a PDF with user and owner passwords.
 * User password is required to open, owner password to modify.
 */
export async function protectPdf(
  buffer: ArrayBuffer,
  options: ProtectOptions
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  // pdf-lib encryption support varies by version/fork
  const saveOptions: Record<string, unknown> = {};
  if (options.userPassword) saveOptions.userPassword = options.userPassword;
  if (options.ownerPassword) saveOptions.ownerPassword = options.ownerPassword;
  return doc.save(saveOptions as Parameters<typeof doc.save>[0]);
}

/**
 * Attempts to unlock a password-protected PDF.
 * Returns the decrypted PDF bytes if successful.
 */
export async function unlockPdf(
  buffer: ArrayBuffer,
  password: string
): Promise<Uint8Array> {
  // pdf-lib encryption support varies by version/fork
  const loadOptions: Record<string, unknown> = {
    password,
    ignoreEncryption: false,
  };
  const doc = await PDFDocument.load(buffer, loadOptions as Parameters<typeof PDFDocument.load>[1]);
  // Re-save without encryption
  return doc.save();
}

// ─── Text Watermark ───────────────────────────────────────────────────────────

export interface TextWatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number; // 0.0–1.0
  rotation: number; // degrees
  color: { r: number; g: number; b: number }; // 0–1 each
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pages?: number[]; // 0-based, undefined = all pages
}

export async function addTextWatermark(
  buffer: ArrayBuffer,
  options: TextWatermarkOptions
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const targetPages = options.pages
    ? pages.filter((_, i) => options.pages!.includes(i))
    : pages;

  for (const page of targetPages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = options.fontSize;

    let x: number, y: number;
    switch (options.position) {
      case "center":
        x = (width - textWidth) / 2;
        y = (height - textHeight) / 2;
        break;
      case "top-left":
        x = 40;
        y = height - 40 - textHeight;
        break;
      case "top-right":
        x = width - textWidth - 40;
        y = height - 40 - textHeight;
        break;
      case "bottom-left":
        x = 40;
        y = 40;
        break;
      case "bottom-right":
        x = width - textWidth - 40;
        y = 40;
        break;
    }

    page.drawText(options.text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(options.color.r, options.color.g, options.color.b),
      opacity: options.opacity,
      rotate: degrees(options.rotation),
    });
  }
  return doc.save();
}

// ─── Image Watermark ──────────────────────────────────────────────────────────

export interface ImageWatermarkOptions {
  imageBuffer: ArrayBuffer;
  imageType: "image/png" | "image/jpeg";
  scale: number; // 0.1–2.0 (fraction of page width)
  opacity: number; // 0.0–1.0
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pages?: number[];
}

export async function addImageWatermark(
  buffer: ArrayBuffer,
  options: ImageWatermarkOptions
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const image =
    options.imageType === "image/jpeg"
      ? await doc.embedJpg(options.imageBuffer)
      : await doc.embedPng(options.imageBuffer);

  const pages = doc.getPages();
  const targetPages = options.pages
    ? pages.filter((_, i) => options.pages!.includes(i))
    : pages;

  for (const page of targetPages) {
    const { width, height } = page.getSize();
    const imgW = width * options.scale;
    const imgH = imgW * (image.height / image.width);

    let x: number, y: number;
    switch (options.position) {
      case "center":
        x = (width - imgW) / 2;
        y = (height - imgH) / 2;
        break;
      case "top-left":
        x = 30;
        y = height - imgH - 30;
        break;
      case "top-right":
        x = width - imgW - 30;
        y = height - imgH - 30;
        break;
      case "bottom-left":
        x = 30;
        y = 30;
        break;
      case "bottom-right":
        x = width - imgW - 30;
        y = 30;
        break;
    }

    page.drawImage(image, {
      x,
      y,
      width: imgW,
      height: imgH,
      opacity: options.opacity,
    });
  }
  return doc.save();
}

// ─── Page Numbers ─────────────────────────────────────────────────────────────

export interface PageNumberOptions {
  format: "numeric" | "roman" | "withTotal"; // "1", "i", "1 / 10"
  position: "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right";
  fontSize: number;
  startNumber: number;
  prefix?: string; // e.g. "Page "
  margin: number; // points from edge
  color: { r: number; g: number; b: number };
  pages?: number[]; // 0-based, undefined = all
}

function toRoman(num: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result.toLowerCase();
}

export async function addPageNumbers(
  buffer: ArrayBuffer,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  const targetPages = options.pages
    ? pages.filter((_, i) => options.pages!.includes(i))
    : pages;

  targetPages.forEach((page, index) => {
    const pageNum = options.startNumber + index;
    let label: string;
    switch (options.format) {
      case "roman":
        label = (options.prefix ?? "") + toRoman(pageNum);
        break;
      case "withTotal":
        label = (options.prefix ?? "") + `${pageNum} / ${total}`;
        break;
      default:
        label = (options.prefix ?? "") + String(pageNum);
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);
    const m = options.margin;

    let x: number, y: number;
    switch (options.position) {
      case "bottom-center":
        x = (width - textWidth) / 2; y = m; break;
      case "bottom-left":
        x = m; y = m; break;
      case "bottom-right":
        x = width - textWidth - m; y = m; break;
      case "top-center":
        x = (width - textWidth) / 2; y = height - m - options.fontSize; break;
      case "top-left":
        x = m; y = height - m - options.fontSize; break;
      case "top-right":
        x = width - textWidth - m; y = height - m - options.fontSize; break;
    }

    page.drawText(label, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(options.color.r, options.color.g, options.color.b),
    });
  });

  return doc.save();
}

// ─── Annotations ──────────────────────────────────────────────────────────────

/**
 * Annotation stored using fractional (0-1) coordinates of page dimensions.
 * This ensures annotations are resolution-independent.
 */
export interface PdfAnnotation {
  id: string;
  type: "text" | "highlight" | "rectangle" | "circle" | "line" | "freehand";
  pageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  lineWidth?: number;
  filled?: boolean;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
}

/**
 * Applies annotations to PDF pages and returns the annotated PDF.
 */
export async function applyAnnotations(
  buffer: ArrayBuffer,
  annotations: PdfAnnotation[]
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const ann of annotations) {
    const page = pages[ann.pageIndex];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    const x = ann.x * pw;
    const y = ph - ann.y * ph;
    const c = rgb(ann.color.r, ann.color.g, ann.color.b);

    switch (ann.type) {
      case "text": {
        const fs = ann.fontSize ?? 14;
        page.drawText(ann.text ?? "", {
          x,
          y: y - fs,
          size: fs,
          font,
          color: c,
          opacity: ann.opacity,
        });
        break;
      }
      case "highlight": {
        const w = (ann.width ?? 0) * pw;
        const h = (ann.height ?? 0) * ph;
        page.drawRectangle({
          x,
          y: y - h,
          width: w,
          height: h,
          color: c,
          opacity: ann.opacity * 0.35,
          borderWidth: 0,
        });
        break;
      }
      case "rectangle": {
        const w = (ann.width ?? 0) * pw;
        const h = (ann.height ?? 0) * ph;
        if (ann.filled) {
          page.drawRectangle({
            x,
            y: y - h,
            width: w,
            height: h,
            color: c,
            opacity: ann.opacity,
            borderWidth: 0,
          });
        } else {
          page.drawRectangle({
            x,
            y: y - h,
            width: w,
            height: h,
            borderColor: c,
            borderWidth: ann.lineWidth ?? 2,
            opacity: ann.opacity,
          });
        }
        break;
      }
      case "circle": {
        const w = (ann.width ?? 0) * pw;
        const h = (ann.height ?? 0) * ph;
        const rx = w / 2;
        const ry = h / 2;
        page.drawEllipse({
          x: x + rx,
          y: y - ry,
          xScale: rx,
          yScale: ry,
          borderColor: c,
          borderWidth: ann.lineWidth ?? 2,
          opacity: ann.opacity,
        });
        break;
      }
      case "line": {
        page.drawLine({
          start: { x, y },
          end: { x: (ann.endX ?? 0) * pw, y: ph - (ann.endY ?? 0) * ph },
          thickness: ann.lineWidth ?? 2,
          color: c,
          opacity: ann.opacity,
        });
        break;
      }
      case "freehand": {
        if (!ann.points || ann.points.length < 2) break;
        for (let i = 1; i < ann.points.length; i++) {
          const p1 = ann.points[i - 1];
          const p2 = ann.points[i];
          page.drawLine({
            start: { x: p1.x * pw, y: ph - p1.y * ph },
            end: { x: p2.x * pw, y: ph - p2.y * ph },
            thickness: ann.lineWidth ?? 2,
            color: c,
            opacity: ann.opacity,
            lineCap: LineCapStyle.Round,
          });
        }
        break;
      }
    }
  }

  return doc.save();
}

// ─── Redaction ────────────────────────────────────────────────────────────────

export interface RedactionRect {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Applies redaction rectangles to a PDF.
 * Draws black filled rectangles over the specified areas.
 * NOTE: This is visual redaction — for full content removal, use server-side PyMuPDF.
 */
export async function applyRedactions(
  buffer: ArrayBuffer,
  redactions: RedactionRect[]
): Promise<Uint8Array> {
  const doc = await loadDoc(buffer);
  const pages = doc.getPages();

  for (const rect of redactions) {
    const page = pages[rect.pageIndex];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    page.drawRectangle({
      x: rect.x * pw,
      y: ph - rect.y * ph - rect.height * ph,
      width: rect.width * pw,
      height: rect.height * ph,
      color: grayscale(0),
      opacity: 1,
      borderWidth: 0,
    });
  }

  return doc.save();
}
