let electron = null;
try {
  electron = window.require('electron');
} catch {
  // Ignore if not in Electron environment
}

export const isElectron = !!electron;
export const ipcRenderer = electron?.ipcRenderer || null;
export const webUtils = electron?.webUtils || null;
export const shell = electron?.shell || null;

/**
 * Sends an IPC message to the main process.
 */
export function sendIpc(channel, ...args) {
  if (ipcRenderer) {
    ipcRenderer.send(channel, ...args);
  }
}

/**
 * Registers an IPC listener. Returns a function to unsubscribe.
 */
export function onIpc(channel, listener) {
  if (!ipcRenderer) {
    return () => {};
  }
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}
