/**
 * api-client.ts — HTTP client for server-side PDF operations (compression, OCR, etc.)
 * Used only when browser-side processing isn't sufficient.
 */

const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ||
  "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new ApiError(text, res.status);
  }
  return res.json() as Promise<T>;
}

// ─── Compression ──────────────────────────────────────────────────────────────

export interface CompressRequest {
  file: File;
  preset: string;
  colorDpi: number;
  grayDpi: number;
  monoDpi: number;
  jpegQuality: number;
}

export interface CompressResponse {
  jobId: string;
  downloadUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}

export async function compressPdf(
  req: CompressRequest,
  onProgress?: (pct: number) => void
): Promise<CompressResponse> {
  const form = new FormData();
  form.append("file", req.file);
  form.append("preset", req.preset);
  form.append("colorDpi", String(req.colorDpi));
  form.append("grayDpi", String(req.grayDpi));
  form.append("monoDpi", String(req.monoDpi));
  form.append("jpegQuality", String(req.jpegQuality));

  // Use XMLHttpRequest for upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/compress`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 50)); // 0–50% for upload
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CompressResponse);
      } else {
        reject(new ApiError(xhr.responseText, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error", 0));
    xhr.send(form);
  });
}

// ─── Download helper ──────────────────────────────────────────────────────────

export async function downloadJob(downloadUrl: string): Promise<Blob> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new ApiError("Download failed", res.status);
  return res.blob();
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── PDF to Image (server-side, higher quality) ───────────────────────────────

export interface PdfToImageRequest {
  file: File;
  format: "png" | "jpeg" | "webp";
  dpi: number;
  pages?: number[];
}

export interface PdfToImageResponse {
  urls: string[];
  pageCount: number;
}

export async function pdfToImages(
  req: PdfToImageRequest
): Promise<PdfToImageResponse> {
  const form = new FormData();
  form.append("file", req.file);
  form.append("format", req.format);
  form.append("dpi", String(req.dpi));
  if (req.pages) form.append("pages", JSON.stringify(req.pages));
  const res = await fetch(`${API_BASE}/convert/pdf-to-images`, {
    method: "POST",
    body: form,
  });
  return handleResponse<PdfToImageResponse>(res);
}
