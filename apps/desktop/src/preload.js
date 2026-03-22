/**
 * preload.js — Context bridge between Electron's main process and the renderer.
 *
 * Security model:
 * - contextIsolation: true — renderer cannot access Node.js APIs directly
 * - All exposed APIs are explicitly allowlisted here
 * - Only safe, narrowly-scoped operations are exposed
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ─── File dialogs ────────────────────────────────────────────────────────────

  /**
   * Open file picker. Returns array of file paths or empty array if cancelled.
   */
  openFiles: (options) =>
    ipcRenderer.invoke("dialog:openFiles", options),

  /**
   * Open folder picker. Returns folder path or null if cancelled.
   */
  openFolder: () =>
    ipcRenderer.invoke("dialog:openFolder"),

  /**
   * Save As dialog. Returns file path or null if cancelled.
   */
  saveFile: (options) =>
    ipcRenderer.invoke("dialog:saveFile", options),

  // ─── File system ─────────────────────────────────────────────────────────────

  /**
   * Read file from disk. Returns Base64-encoded contents.
   */
  readFile: (filePath) =>
    ipcRenderer.invoke("fs:readFile", filePath),

  /**
   * Write Base64 data to a file on disk.
   */
  writeFile: (filePath, base64Data) =>
    ipcRenderer.invoke("fs:writeFile", filePath, base64Data),

  /**
   * Get file metadata.
   */
  statFile: (filePath) =>
    ipcRenderer.invoke("fs:stat", filePath),

  /**
   * Open a folder in system file manager.
   */
  openFolderInExplorer: (folderPath) =>
    ipcRenderer.invoke("shell:openFolder", folderPath),

  // ─── App info ─────────────────────────────────────────────────────────────────

  /**
   * Get the current app version string.
   */
  getVersion: () =>
    ipcRenderer.invoke("app:version"),

  /**
   * Check if running in Electron (always true when this API is available).
   */
  isElectron: true,
});
