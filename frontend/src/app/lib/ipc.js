export const sendWindowEvent = (channel) => {
  try {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send(channel);
  } catch {
    // Ignore non-Electron environments.
  }
};

export const selectFolder = async (defaultPath) => {
  try {
    const { ipcRenderer } = window.require('electron');
    return await ipcRenderer.invoke('select-folder', defaultPath);
  } catch {
    return null;
  }
};

export const selectFile = async (defaultPath) => {
  try {
    const { ipcRenderer } = window.require('electron');
    return await ipcRenderer.invoke('select-file', defaultPath);
  } catch {
    return null;
  }
};

export const showItemInFolder = async (filePath) => {
  try {
    const { ipcRenderer } = window.require('electron');
    return await ipcRenderer.invoke('show-item-in-folder', filePath);
  } catch {
    return { success: false, error: 'Unavailable outside Electron' };
  }
};
