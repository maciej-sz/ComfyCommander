const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const os = require('os');
const NodeFileSystem = require('../lib/vfs/NodeFileSystem');
const MemoryFileSystem = require('../lib/vfs/MemoryFileSystem');

// Helper to create a temp dir for NodeFS
const createTempDir = async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vfs-test-'));
    return tmpDir;
};

const cleanupTempDir = async (dir) => {
    if (dir) {
        await fs.promises.rm(dir, { recursive: true, force: true });
    }
};

describe('VFS Implementation Tests', () => {
    
    describe('MemoryFileSystem', () => {
        let vfs;
        const homeDir = process.platform === 'win32' ? 'C:\\Users\\Test' : '/home/test';

        beforeEach(() => {
            // Setup initial state
            const initialFiles = {};
            initialFiles[path.join(homeDir, 'file1.txt')] = 'file';
            initialFiles[path.join(homeDir, 'folder1')] = 'dir';
            vfs = new MemoryFileSystem(initialFiles);
        });

        it('should get home directory', async () => {
            expect(await vfs.getHomeDir()).to.equal(homeDir);
        });

        it('should list directory contents sorted', async () => {
            const files = await vfs.listDir(homeDir);
            expect(files).to.have.lengthOf(2);
            expect(files[0].name).to.equal('folder1'); // Dir first
            expect(files[0].isDirectory).to.be.true;
            expect(files[1].name).to.equal('file1.txt');
            expect(files[1].isDirectory).to.be.false;
        });

        it('should copy file', async () => {
            const source = path.join(homeDir, 'file1.txt');
            const destDir = path.join(homeDir, 'folder1');
            
            await vfs.copyFile(source, destDir);
            
            const files = await vfs.listDir(destDir);
            expect(files).to.have.lengthOf(1);
            expect(files[0].name).to.equal('file1.txt');
        });

        it('should fail to copy if source does not exist', async () => {
            const source = path.join(homeDir, 'nonexistent.txt');
            const destDir = homeDir;
            
            try {
                await vfs.copyFile(source, destDir);
                throw new Error('Should have failed');
            } catch (e) {
                expect(e.message).to.include('ENOENT');
            }
        });
    });

    describe('NodeFileSystem', () => {
        let vfs;
        let tmpDir;

        beforeEach(async () => {
            tmpDir = await createTempDir();
            vfs = new NodeFileSystem();
            
            // Setup initial state in temp dir
            await fs.promises.writeFile(path.join(tmpDir, 'file1.txt'), 'content');
            await fs.promises.mkdir(path.join(tmpDir, 'folder1'));
        });

        afterEach(async () => {
            await cleanupTempDir(tmpDir);
        });

        it('should list directory contents sorted', async () => {
            const files = await vfs.listDir(tmpDir);
            expect(files).to.have.lengthOf(2);
            expect(files[0].name).to.equal('folder1');
            expect(files[0].isDirectory).to.be.true;
            expect(files[1].name).to.equal('file1.txt');
            expect(files[1].isDirectory).to.be.false;
        });

        it('should copy file', async () => {
            const source = path.join(tmpDir, 'file1.txt');
            const destDir = path.join(tmpDir, 'folder1');
            
            await vfs.copyFile(source, destDir);
            
            const files = await vfs.listDir(destDir);
            expect(files).to.have.lengthOf(1);
            expect(files[0].name).to.equal('file1.txt');
        });
    });
});
