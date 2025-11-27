const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const NodeFileSystem = require('./lib/vfs/NodeFileSystem');
const MemoryFileSystem = require('./lib/vfs/MemoryFileSystem');

let vfs;

// Initialize VFS based on environment variable
if (process.env.USE_MEMORY_FS === 'true') {
    const homeDir = process.platform === 'win32' ? 'C:\\Users\\Test' : '/home/test';
    const initialFiles = {
        [path.join(homeDir, 'file1.txt')]: 'file',
        [path.join(homeDir, 'folder1')]: 'dir',
        [path.join(homeDir, 'folder1', 'subfile.txt')]: 'file'
    };
    vfs = new MemoryFileSystem(initialFiles);
    console.log('Using MemoryFileSystem');
} else {
    vfs = new NodeFileSystem();
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true, // Hide the menu bar by default
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

ipcMain.handle('get-basename', (event, filePath) => {
    return path.basename(filePath);
});
