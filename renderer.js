const state = {
    left: {
        path: '',
        files: [],
        focusedIndex: 0, // The cursor
        selectedIndices: new Set(), // The "tagged" files
        element: document.getElementById('left-panel'),
        listElement: document.getElementById('left-list'),
        pathElement: document.getElementById('left-path')
    },
    right: {
        path: '',
        files: [],
        focusedIndex: 0,
        selectedIndices: new Set(),
        element: document.getElementById('right-panel'),
        listElement: document.getElementById('right-list'),
        pathElement: document.getElementById('right-path')
    },
    active: 'left'
};

// Initialize
(async () => {
    const homeDir = await window.api.getHomeDir();
    state.left.path = homeDir;
    state.right.path = homeDir;
    
    await loadDir('left', homeDir);
    await loadDir('right', homeDir);
    
    updateActivePanelUI();
})();

// Functions

async function loadDir(side, dirPath) {
    const result = await window.api.listDir(dirPath);
    if (result.success) {
        const oldPath = state[side].path;
        state[side].path = dirPath;
        const files = result.files;
        
        // Add parent directory entry manually for navigation
        files.unshift({ name: '..', isDirectory: true, path: await window.api.getParentDir(dirPath) });
        
        state[side].files = files;
        
        // Navigation Logic:
        // If we are going up (dirPath is parent of oldPath), focus on the directory we just exited.
        let newFocusedIndex = 0;
        if (oldPath) {
            const parentOfOld = await window.api.getParentDir(oldPath);
            // Check if new dir is parent of old dir
            // Note: Simple string comparison might fail on trailing slashes or case sensitivity (on Windows), 
            // but assuming canonical paths from backend for now.
            if (parentOfOld === dirPath) {
                const exitedDirName = await window.api.getBasename(oldPath);
                // Find index of this dir in the new list
                // Note: files list has '..' at index 0 usually.
                // The files from backend (vfs) are sorted.
                // We need to match name.
                // Note: renderer adds '[ ]' around directories for display but raw file object name is clean.
                const index = files.findIndex(f => f.name === exitedDirName);
                if (index !== -1) {
                    newFocusedIndex = index;
                }
            }
        }

        state[side].focusedIndex = newFocusedIndex;
        state[side].selectedIndices = new Set(); // Clear selections on dir change
        state[side].pathElement.textContent = dirPath;
        renderList(side);
    } else {
        alert(`Error loading directory: ${result.error}`);
    }
}

function renderList(side) {
    const panel = state[side];
    panel.listElement.innerHTML = '';
    
    panel.files.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        if (file.isDirectory) {
            div.classList.add('is-directory');
            div.textContent = `[${file.name}]`;
        } else {
            div.textContent = file.name;
        }
        
        // Apply focus style (cursor)
        if (index === panel.focusedIndex) {
            div.classList.add('focused');
        }

        // Apply selection style (tagged)
        if (panel.selectedIndices.has(index)) {
            div.classList.add('selected');
        }
        
        div.onclick = (e) => {
            setActivePanel(side);
            
            if (e.ctrlKey) {
                // Toggle selection
                if (panel.selectedIndices.has(index)) {
                    panel.selectedIndices.delete(index);
                } else {
                    panel.selectedIndices.add(index);
                }
            } else {
                // Standard behavior: clear other selections
                if (!e.ctrlKey) {
                    panel.selectedIndices.clear();
                }
            }
            
            panel.focusedIndex = index;
            renderList(side);
        };
        
        div.ondblclick = () => {
            if (file.isDirectory) {
                loadDir(side, file.path);
            }
        };
        
        panel.listElement.appendChild(div);
    });
    
    // Ensure focused item is visible initially
    ensureVisible(side);
}

function setActivePanel(side) {
    state.active = side;
    state.left.element.classList.remove('active-panel');
    state.right.element.classList.remove('active-panel');
    state[side].element.classList.add('active-panel');
}

function updateActivePanelUI() {
    setActivePanel(state.active);
}

// Keyboard Navigation
const PAGE_SIZE = 20;

document.addEventListener('keydown', async (e) => {
    const activeSide = state.active;
    const panel = state[activeSide];
    
    if (e.key === 'Tab') {
        e.preventDefault();
        setActivePanel(activeSide === 'left' ? 'right' : 'left');
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (panel.focusedIndex < panel.files.length - 1) {
            panel.focusedIndex++;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (panel.focusedIndex > 0) {
            panel.focusedIndex--;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'Insert') {
        e.preventDefault();
        // Toggle selection of current
        if (panel.selectedIndices.has(panel.focusedIndex)) {
            panel.selectedIndices.delete(panel.focusedIndex);
        } else {
            panel.selectedIndices.add(panel.focusedIndex);
        }
        // Move down
        if (panel.focusedIndex < panel.files.length - 1) {
            panel.focusedIndex++;
        }
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'Home') {
        e.preventDefault();
        panel.focusedIndex = 0;
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'End') {
        e.preventDefault();
        panel.focusedIndex = Math.max(0, panel.files.length - 1);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageUp') {
        e.preventDefault();
        panel.focusedIndex = Math.max(0, panel.focusedIndex - PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageDown') {
        e.preventDefault();
        panel.focusedIndex = Math.min(panel.files.length - 1, panel.focusedIndex + PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const file = panel.files[panel.focusedIndex];
        if (file && file.isDirectory) {
            await loadDir(activeSide, file.path);
        }
    } else if (e.key === 'F5') {
        e.preventDefault();
        performCopy();
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        const currentPath = panel.path;
        const parentPath = await window.api.getParentDir(currentPath);
        if (currentPath !== parentPath) { // Prevent going up from root
            await loadDir(activeSide, parentPath);
        }
    }
});

function ensureVisible(side) {
    const panel = state[side];
    const el = panel.listElement.children[panel.focusedIndex];
    if (el) {
        el.scrollIntoView({ block: 'nearest' });
    }
}

// Copy Functionality
async function performCopy() {
    const sourceSide = state.active;
    const destSide = sourceSide === 'left' ? 'right' : 'left';
    
    const sourcePanel = state[sourceSide];
    const destPanel = state[destSide];
    
    // Determine which files to copy
    let filesToCopy = [];
    
    if (sourcePanel.selectedIndices.size > 0) {
        // Copy selected files
        for (const index of sourcePanel.selectedIndices) {
            filesToCopy.push(sourcePanel.files[index]);
        }
    } else {
        // Copy focused file if nothing selected
        filesToCopy.push(sourcePanel.files[sourcePanel.focusedIndex]);
    }
    
    // Filter out invalid files (like '..')
    filesToCopy = filesToCopy.filter(f => f && f.name !== '..');
    
    if (filesToCopy.length === 0) return;
    
    const status = document.getElementById('status-bar');
    status.textContent = `Copying ${filesToCopy.length} files...`;
    
    let errors = [];
    
    for (const file of filesToCopy) {
        const result = await window.api.copyFile(file.path, destPanel.path);
        if (!result.success) {
            errors.push(`${file.name}: ${result.error}`);
        }
    }
    
    if (errors.length === 0) {
        status.textContent = `Copied ${filesToCopy.length} files successfully.`;
    } else {
        status.textContent = `Finished with errors.`;
        alert(`Errors:\n${errors.join('\n')}`);
    }
    
    // Refresh dest panel
    await loadDir(destSide, destPanel.path);
    
    // Clear selection after operation? (Commander usually keeps it, Explorer clears it)
    // Let's keep it for now.
}

// Button listener
document.getElementById('copy-btn').addEventListener('click', performCopy);

// Resizing Logic
const separator = document.getElementById('separator');
const leftPanel = document.getElementById('left-panel');
const container = document.getElementById('container');

let isResizing = false;

separator.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    
    // Limit resizing to keep panels usable (e.g., min 100px)
    if (newLeftWidth < 100 || newLeftWidth > containerRect.width - 100) return;

    leftPanel.style.width = `${newLeftWidth}px`;
    leftPanel.style.flex = '0 0 auto'; 
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
    }
});