const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

ipcMain.handle('get-home-dir', () => {
    return os.homedir();
});

ipcMain.handle('list-dir', async (event, dirPath) => {
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const result = files.map(file => {
            return {
                name: file.name,
                isDirectory: file.isDirectory(),
                path: path.join(dirPath, file.name)
            };
        });
        // Sort: Directories first, then files
        result.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });
        return { success: true, files: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('copy-file', async (event, sourcePath, destDir) => {
    try {
        const fileName = path.basename(sourcePath);
        const destPath = path.join(destDir, fileName);
        
        // Prevent overwriting for this basic clone or simple error
        // In a real app, we might ask for confirmation.
        // Here we'll just use copyFile. 
        // COPYFILE_EXCL causes operation to fail if dest exists.
        await fs.promises.copyFile(sourcePath, destPath, fs.constants.COPYFILE_EXCL);
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
