/**
 * python-worker.ts — HTTP client for the Python FastAPI sidecar.
 */
import { Readable } from "stream";

const WORKER_HOST =
  process.env.PYTHON_WORKER_HOST ?? "http://localhost:8000";

export class WorkerError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "WorkerError";
  }
}

async function workerFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const url = `${WORKER_HOST}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new WorkerError(text, res.status);
  }
  return res;
}

export interface CompressPayload {
  inputPath: string;
  outputPath: string;
  preset: string;
  colorDpi: number;
  grayDpi: number;
  monoDpi: number;
  jpegQuality: number;
}

export async function callCompress(payload: CompressPayload): Promise<void> {
  await workerFetch("/compress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function workerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_HOST}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
