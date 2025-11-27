const fs = require('fs');
const path = require('path');
const os = require('os');
const FileSystem = require('./FileSystem');

class NodeFileSystem extends FileSystem {
    async listDir(dirPath) {
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
        return result;
    }

    async copyFile(sourcePath, destDir) {
        const fileName = path.basename(sourcePath);
        const destPath = path.join(destDir, fileName);
        await fs.promises.copyFile(sourcePath, destPath, fs.constants.COPYFILE_EXCL);
    }

    async getHomeDir() {
        return os.homedir();
    }
}

module.exports = NodeFileSystem;
