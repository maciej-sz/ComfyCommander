class FileSystem {
    async listDir(dirPath) {
        throw new Error("Method 'listDir' must be implemented.");
    }

    async copyFile(sourcePath, destDir) {
        throw new Error("Method 'copyFile' must be implemented.");
    }

    async getHomeDir() {
        throw new Error("Method 'getHomeDir' must be implemented.");
    }
}

module.exports = FileSystem;
