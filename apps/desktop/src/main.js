/**
 * main.js — Electron main process for PdfTwist desktop app.
 *
 * Architecture:
 * - Loads the pre-built React SPA from ../web/dist (bundled via extraResources)
 * - In dev mode, loads from http://localhost:3000 (Vite dev server)
 * - Exposes secure file system operations via IPC (contextBridge in preload.js)
 * - No nodeIntegration in renderer — all Node.js access via contextBridge
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// ─── Window management ────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,      // Security: isolate renderer
      nodeIntegration: false,       // Security: no Node in renderer
      sandbox: false,               // Allow preload to use require
      webSecurity: true,
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    show: false, // Show after ready-to-show for smooth launch
  });

  // Load app URL
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const webDistPath = path.join(process.resourcesPath, "web", "index.html");
    mainWindow.loadFile(webDistPath);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Check for updates (production only)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ─── Security: prevent navigation to external URLs ────────────────────────────

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    const isLocal = url.startsWith("file://") || url.startsWith("http://localhost");
    if (!isLocal) event.preventDefault();
  });
});

// ─── IPC Handlers — File system operations ────────────────────────────────────

/**
 * Open a file picker and return the selected file paths.
 */
ipcMain.handle("dialog:openFiles", async (_event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || "Open PDF files",
    filters: options.filters || [{ name: "PDF Files", extensions: ["pdf"] }],
    properties: ["openFile", "multiSelections", ...(options.properties || [])],
  });
  return result.canceled ? [] : result.filePaths;
});

/**
 * Open a folder picker and return the selected folder path.
 */
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

/**
 * Save a file with a "Save As" dialog.
 */
ipcMain.handle("dialog:saveFile", async (_event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || "Save file",
    defaultPath: options.defaultPath || "output.pdf",
    filters: options.filters || [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  return result.canceled ? null : result.filePath;
});

/**
 * Read a file from disk and return its contents as a Base64 string.
 */
ipcMain.handle("fs:readFile", async (_event, filePath) => {
  const resolved = path.resolve(filePath);
  // Only allow reading from user's home directory or below
  if (!resolved.startsWith(app.getPath("home"))) {
    throw new Error("Access denied: path outside home directory");
  }
  const buf = fs.readFileSync(resolved);
  return buf.toString("base64");
});

/**
 * Write Base64 data to a file on disk.
 */
ipcMain.handle("fs:writeFile", async (_event, filePath, base64Data) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(app.getPath("home"))) {
    throw new Error("Access denied: path outside home directory");
  }
  const buf = Buffer.from(base64Data, "base64");
  fs.writeFileSync(resolved, buf);
  return { success: true, size: buf.byteLength };
});

/**
 * Get file metadata (size, name).
 */
ipcMain.handle("fs:stat", async (_event, filePath) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(app.getPath("home"))) {
    throw new Error("Access denied");
  }
  const stat = fs.statSync(resolved);
  return { size: stat.size, name: path.basename(resolved) };
});

/**
 * Open a folder in the system file manager.
 */
ipcMain.handle("shell:openFolder", async (_event, folderPath) => {
  shell.openPath(folderPath);
});

/**
 * Get app version.
 */
ipcMain.handle("app:version", () => app.getVersion());
