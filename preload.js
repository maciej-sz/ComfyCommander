const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
    listDir: (path) => ipcRenderer.invoke('list-dir', path),
    copyFile: (source, dest) => ipcRenderer.invoke('copy-file', source, dest),
    pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args),
    getParentDir: (path) => ipcRenderer.invoke('get-parent-dir', path)
});
