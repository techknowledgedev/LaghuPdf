/**
 * file-cleanup.ts — Automatically deletes temporary and output files.
 *
 * Processing temp files: deleted immediately after job completion.
 * Output files (download links): deleted after OUTPUT_TTL_MS (default 30 min).
 */
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const TEMP_DIR = process.env.TEMP_DIR ?? "/tmp/pdftwist";
const OUTPUT_TTL_MS =
  Number(process.env.OUTPUT_FILE_TTL_MINUTES ?? 30) * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // run cleanup every 5 minutes

// Track output files and their expiry times
const outputFiles = new Map<string, number>(); // filepath → expiresAt timestamp

export function getTempDir(): string {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  return TEMP_DIR;
}

/**
 * Register an output file for automatic deletion after TTL.
 */
export function registerOutputFile(filePath: string): void {
  outputFiles.set(filePath, Date.now() + OUTPUT_TTL_MS);
}

/**
 * Delete a temp/processing file immediately.
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be gone — ignore
  }
}

/**
 * Purge all expired output files.
 */
async function purgeExpiredOutputs(): Promise<void> {
  const now = Date.now();
  for (const [filePath, expiresAt] of outputFiles.entries()) {
    if (now >= expiresAt) {
      await deleteTempFile(filePath);
      outputFiles.delete(filePath);
    }
  }
}

/**
 * Purge all files in temp dir older than TEMP_TTL_SECONDS (safety net).
 */
async function purgeOrphanedTempFiles(): Promise<void> {
  const TEMP_TTL_MS =
    Number(process.env.TEMP_FILE_TTL_SECONDS ?? 60) * 1000;
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const fp = path.join(TEMP_DIR, file);
      try {
        const stat = await fs.stat(fp);
        if (now - stat.mtimeMs > TEMP_TTL_MS) {
          await fs.unlink(fp);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // directory may not exist yet
  }
}

export const FileCleanupService = {
  start(): void {
    setInterval(async () => {
      await purgeExpiredOutputs();
      await purgeOrphanedTempFiles();
    }, CLEANUP_INTERVAL_MS);

    // Also run once at startup
    void purgeOrphanedTempFiles();
  },
};
