/**
 * Platform detection — determines if running inside Electron or a browser.
 * All platform-specific code should branch through these utilities.
 */

export const isElectron = (): boolean => {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { electronAPI?: unknown }).electronAPI !==
      "undefined"
  );
};

export const isBrowser = (): boolean => !isElectron();

export const platform = {
  isElectron: isElectron(),
  isBrowser: isBrowser(),
  isWindows: navigator.platform.startsWith("Win"),
  isMac: navigator.platform.startsWith("Mac"),
  isLinux: navigator.platform.startsWith("Linux"),
};
