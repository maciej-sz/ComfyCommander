const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const NodeFileSystem = require('./lib/vfs/NodeFileSystem');

const vfs = new NodeFileSystem();

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

ipcMain.handle('get-home-dir', async () => {
    return await vfs.getHomeDir();
});

ipcMain.handle('list-dir', async (event, dirPath) => {
    try {
        const files = await vfs.listDir(dirPath);
        return { success: true, files: files };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('copy-file', async (event, sourcePath, destDir) => {
    try {
        await vfs.copyFile(sourcePath, destDir);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('path-join', (event, ...args) => {
    return path.join(...args);
});

ipcMain.handle('get-parent-dir', (event, dirPath) => {
    return path.dirname(dirPath);
});
