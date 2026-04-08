/**
 * electron-bridge.ts — Type-safe wrapper around the Electron contextBridge API.
 * Only used when running inside Electron (platform.isElectron === true).
 */

interface ElectronAPI {
  openFiles: (options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string[]>;
  openFolder: () => Promise<string | null>;
  saveFile: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  readFile: (filePath: string) => Promise<string>; // base64
  writeFile: (filePath: string, base64Data: string) => Promise<{ success: boolean; size: number }>;
  statFile: (filePath: string) => Promise<{ size: number; name: string }>;
  openFolderInExplorer: (folderPath: string) => Promise<void>;
  getVersion: () => Promise<string>;
  isElectron: true;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function getElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error("electronAPI not available — not running in Electron");
  }
  return window.electronAPI;
}

/**
 * Pick PDF files using the system file dialog (Electron only).
 * Falls back to browser file input on web.
 */
export async function pickPdfFiles(): Promise<File[]> {
  if (!window.electronAPI) return []; // handled by DropZone in browser
  const paths = await window.electronAPI.openFiles({
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  return Promise.all(
    paths.map(async (p) => {
      const base64 = await window.electronAPI!.readFile(p);
      const buf = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
      const stat = await window.electronAPI!.statFile(p);
      return new File([buf], stat.name, { type: "application/pdf" });
    })
  );
}

/**
 * Save a Blob to disk using the system Save As dialog (Electron only).
 */
export async function saveFileDialog(
  blob: Blob,
  defaultName: string
): Promise<boolean> {
  if (!window.electronAPI) return false;
  const savePath = await window.electronAPI.saveFile({
    defaultPath: defaultName,
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  if (!savePath) return false;
  const arrayBuf = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);
  let binary = "";
  uint8.forEach((b) => (binary += String.fromCharCode(b)));
  const base64 = btoa(binary);
  await window.electronAPI.writeFile(savePath, base64);
  return true;
}
