const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
    listDir: (path) => ipcRenderer.invoke('list-dir', path),
    copyFile: (source, dest) => ipcRenderer.invoke('copy-file', source, dest),
    deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
    trashFile: (path) => ipcRenderer.invoke('trash-file', path),
    pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args),
    getParentDir: (path) => ipcRenderer.invoke('get-parent-dir', path),
    getBasename: (path) => ipcRenderer.invoke('get-basename', path)
});
