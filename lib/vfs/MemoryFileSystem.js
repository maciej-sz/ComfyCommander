const path = require('path');
const FileSystem = require('./FileSystem');

class MemoryFileSystem extends FileSystem {
    constructor(initialFiles = {}) {
        super();
        this.files = new Map();
        // Default home dir based on platform
        this.homeDir = process.platform === 'win32' ? 'C:\\Users\\Test' : '/home/test';
        
        // Ensure home dir exists in the map
        this.files.set(path.normalize(this.homeDir), 'dir');

        // Initialize with provided files
        // Format: { '/path/to/file': 'file', '/path/to/dir': 'dir' }
        for (const [filePath, type] of Object.entries(initialFiles)) {
            this.files.set(path.normalize(filePath), type);
        }
    }

    async listDir(dirPath) {
        const normalizedDir = path.normalize(dirPath);
        
        if (!this.files.has(normalizedDir) || this.files.get(normalizedDir) !== 'dir') {
             throw new Error(`ENOENT: no such file or directory, scandir '${normalizedDir}'`);
        }

        const result = [];
        
        for (const [filePath, type] of this.files.entries()) {
            if (path.dirname(filePath) === normalizedDir && filePath !== normalizedDir) {
                result.push({
                    name: path.basename(filePath),
                    isDirectory: type === 'dir',
                    path: filePath
                });
            }
        }

        // Sort: Directories first, then files
        result.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });

        return result;
    }

    async copyFile(sourcePath, destDir) {
        const src = path.normalize(sourcePath);
        const dir = path.normalize(destDir);
        
        if (!this.files.has(src)) {
            throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
        }
        
        // Check if destDir exists and is a directory
        if (!this.files.has(dir) || this.files.get(dir) !== 'dir') {
             throw new Error(`ENOENT: no such file or directory, scandir '${dir}'`);
        }

        const fileName = path.basename(src);
        const destPath = path.join(dir, fileName);

        if (this.files.has(destPath)) {
             throw new Error(`EEXIST: file already exists, copyfile '${src}' -> '${destPath}'`);
        }

        this.files.set(destPath, this.files.get(src));
    }

    async getHomeDir() {
        return this.homeDir;
    }
}

module.exports = MemoryFileSystem;
