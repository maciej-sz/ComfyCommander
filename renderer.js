const state = {
    left: {
        path: '',
        files: [],
        focusedIndex: 0, // The cursor
        selectedIndices: new Set(), // The "tagged" files
        element: document.getElementById('left-panel'),
        listElement: document.getElementById('left-list'),
        pathElement: document.getElementById('left-path'),
        searchElement: document.getElementById('left-search'),
        searchString: '',
        searchTimer: null
    },
    right: {
        path: '',
        files: [],
        focusedIndex: 0,
        selectedIndices: new Set(),
        element: document.getElementById('right-panel'),
        listElement: document.getElementById('right-list'),
        pathElement: document.getElementById('right-path'),
        searchElement: document.getElementById('right-search'),
        searchString: '',
        searchTimer: null
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
        
        // Reset search on dir change
        clearSearch(side);
        
        renderList(side);
    } else {
        alert(`Error loading directory: ${result.error}`);
    }
}

function clearSearch(side) {
    const panel = state[side];
    panel.searchString = '';
    if (panel.searchTimer) clearTimeout(panel.searchTimer);
    panel.searchTimer = null;
    updateSearchUI(side);
}

function updateSearchUI(side) {
    const panel = state[side];
    if (panel.searchString.length > 0) {
        panel.searchElement.textContent = panel.searchString;
        panel.searchElement.classList.remove('hidden');
    } else {
        panel.searchElement.textContent = '';
        panel.searchElement.classList.add('hidden');
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
    // If modal is open, ignore (handled by capture in modal, but just in case)
    if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;

    const activeSide = state.active;
    const panel = state[activeSide];
    
    // Helper to process search input
    const processSearchInput = (char) => {
        panel.searchString += char;
        
        // Reset timer
        if (panel.searchTimer) clearTimeout(panel.searchTimer);
        panel.searchTimer = setTimeout(() => {
             // Optional: Clear search after timeout?
             // Classic Commander: Usually keeps it for a bit or until move.
             // Let's clear it after 3 seconds of inactivity to keep UI clean.
             clearSearch(activeSide);
        }, 3000);
        
        updateSearchUI(activeSide);
        
        // Find match
        // Prefix match, case insensitive
        const search = panel.searchString.toLowerCase();
        // Skip '..' (index 0 usually)
        const matchIndex = panel.files.findIndex((f, i) => {
            if (f.name === '..') return false;
            // Handle '[name]' display for dirs? No, match against real name.
            return f.name.toLowerCase().startsWith(search);
        });
        
        if (matchIndex !== -1) {
            panel.focusedIndex = matchIndex;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    };

    if (e.key === 'Tab') {
        e.preventDefault();
        clearSearch(activeSide); // Clear search when switching
        setActivePanel(activeSide === 'left' ? 'right' : 'left');
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        clearSearch(activeSide); // Movement clears search usually
        if (panel.focusedIndex < panel.files.length - 1) {
            panel.focusedIndex++;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        clearSearch(activeSide);
        if (panel.focusedIndex > 0) {
            panel.focusedIndex--;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'ArrowRight' && e.ctrlKey && activeSide === 'left') {
        e.preventDefault();
        const file = panel.files[panel.focusedIndex];
        if (file && file.isDirectory) {
            await loadDir('right', file.path);
        }
    } else if (e.key === 'ArrowLeft' && e.ctrlKey && activeSide === 'right') {
        e.preventDefault();
        const file = panel.files[panel.focusedIndex];
        if (file && file.isDirectory) {
            await loadDir('left', file.path);
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
        clearSearch(activeSide);
        panel.focusedIndex = 0;
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'End') {
        e.preventDefault();
        clearSearch(activeSide);
        panel.focusedIndex = Math.max(0, panel.files.length - 1);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageUp') {
        e.preventDefault();
        clearSearch(activeSide);
        panel.focusedIndex = Math.max(0, panel.focusedIndex - PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageDown') {
        e.preventDefault();
        clearSearch(activeSide);
        panel.focusedIndex = Math.min(panel.files.length - 1, panel.focusedIndex + PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        clearSearch(activeSide);
        const file = panel.files[panel.focusedIndex];
        if (file && file.isDirectory) {
            await loadDir(activeSide, file.path);
        }
    } else if (e.key === 'F5') {
        e.preventDefault();
        performCopy();
    } else if (e.key === 'F7') {
        e.preventDefault();
        performMkdir();
    } else if (e.key === 'F8' || e.key === 'Delete') {
        e.preventDefault();
        performDelete(e.shiftKey);
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (panel.searchString.length > 0) {
            // Edit search string
            panel.searchString = panel.searchString.slice(0, -1);
            if (panel.searchTimer) clearTimeout(panel.searchTimer);
            panel.searchTimer = setTimeout(() => clearSearch(activeSide), 3000);
            updateSearchUI(activeSide);
        } else {
            // Go up
            const currentPath = panel.path;
            const parentPath = await window.api.getParentDir(currentPath);
            if (currentPath !== parentPath) { // Prevent going up from root
                await loadDir(activeSide, parentPath);
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        if (panel.searchString.length > 0) {
            clearSearch(activeSide);
        }
    } else {
        // Search Typing
        // Accept single char, no modifiers (except Shift)
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            // Check if printable (simple regex)
            if (/^[\w\s.\-]/.test(e.key) || /[!@#$%^&()_+=[\\]{};',`]/.test(e.key)) {
                 if (e.key === ' ') e.preventDefault();
                 processSearchInput(e.key);
            }
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

    // Confirmation Dialog
    const confirmMessage = `Are you sure you want to copy ${filesToCopy.length} file(s) to "${destPanel.path}"?`;
    const confirmed = await showModal(confirmMessage);
    if (!confirmed) {
        return; // Abort if user cancels
    }
    
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
}

// Delete Functionality
async function performDelete(permanent = false) {
    const activeSide = state.active;
    const panel = state[activeSide];
    
    // Determine which files to delete
    let filesToDelete = [];
    
    if (panel.selectedIndices.size > 0) {
        // Delete selected files
        for (const index of panel.selectedIndices) {
            filesToDelete.push(panel.files[index]);
        }
    } else {
        // Delete focused file if nothing selected
        filesToDelete.push(panel.files[panel.focusedIndex]);
    }
    
    // Filter out invalid files (like '..')
    filesToDelete = filesToDelete.filter(f => f && f.name !== '..');
    
    if (filesToDelete.length === 0) return;

    // Confirmation Dialog
    const actionName = permanent ? 'permanently DELETE' : 'move to TRASH';
    const confirmMessage = `Are you sure you want to ${actionName} ${filesToDelete.length} file(s)?`;
    const confirmed = await showModal(confirmMessage);
    if (!confirmed) {
        return;
    }
    
    const status = document.getElementById('status-bar');
    if (status) status.textContent = `Deleting ${filesToDelete.length} files...`;
    
    let errors = [];
    
    for (const file of filesToDelete) {
        let result;
        if (permanent) {
             result = await window.api.deleteFile(file.path);
        } else {
             result = await window.api.trashFile(file.path);
        }
        
        if (!result.success) {
            errors.push(`${file.name}: ${result.error}`);
        }
    }
    
    if (errors.length === 0) {
        if (status) status.textContent = `Deleted ${filesToDelete.length} files successfully.`;
    } else {
        if (status) status.textContent = `Finished with errors.`;
        alert(`Errors:\n${errors.join('\n')}`);
    }
    
    // Refresh panel
    await loadDir(activeSide, panel.path);
}

// Mkdir Functionality
async function performMkdir() {
    const activeSide = state.active;
    const panel = state[activeSide];

    const newDirName = await showModal('Create new directory:', { input: true });
    
    if (!newDirName) return; // Cancelled or empty
    
    const newPath = await window.api.pathJoin(panel.path, newDirName);
    const result = await window.api.createDirectory(newPath);
    
    if (result.success) {
        await loadDir(activeSide, panel.path);
        // Optional: Select or focus the new dir?
        // Find the new dir in the list and focus it
        const index = panel.files.findIndex(f => f.name === newDirName);
        if (index !== -1) {
            panel.focusedIndex = index;
            renderList(activeSide);
        }
    } else {
        alert(`Error creating directory: ${result.error}`);
    }
}

// Button listener
document.getElementById('copy-btn').addEventListener('click', performCopy);
document.getElementById('mkdir-btn').addEventListener('click', performMkdir);
document.getElementById('delete-btn').addEventListener('click', (e) => {
    // Check for shift key on the click event too!
    performDelete(e.shiftKey);
});

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

// Modal Helper
function showModal(message, options = { input: false, defaultValue: '' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-overlay');
        const msg = document.getElementById('modal-message');
        const inp = document.getElementById('modal-input');
        const btnOk = document.getElementById('modal-confirm');
        const btnCancel = document.getElementById('modal-cancel');

        msg.textContent = message;
        
        if (options.input) {
            inp.value = options.defaultValue || '';
            inp.classList.remove('hidden');
        } else {
            inp.classList.add('hidden');
        }
        
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            inp.classList.add('hidden');
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
            window.removeEventListener('keydown', handleKeydown, true);
            // Return focus to active panel
            if (state[state.active] && state[state.active].element) {
                state[state.active].element.focus();
            }
        };

        const handleOk = () => {
            const value = options.input ? inp.value : true;
            cleanup();
            resolve(value);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const handleKeydown = (e) => {
             // Block all interactions with the app while modal is open
             e.stopPropagation();
             
             if (e.key === 'Tab') {
                 e.preventDefault();
                 // Cycle focus
                 const focusable = [];
                 if (options.input) focusable.push(inp);
                 focusable.push(btnOk, btnCancel);
                 
                 const currentIndex = focusable.indexOf(document.activeElement);
                 const nextIndex = (currentIndex + 1) % focusable.length;
                 focusable[nextIndex].focus();
                 return;
             }
             
             if (e.key === 'Enter') {
                 e.preventDefault();
                 if (document.activeElement === btnCancel) {
                     handleCancel();
                 } else {
                     handleOk();
                 }
             } else if (e.key === 'Escape') {
                 e.preventDefault();
                 handleCancel();
             }
        };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
        
        // Capture phase to intercept global keys
        window.addEventListener('keydown', handleKeydown, true);
        
        if (options.input) {
            inp.focus();
        } else {
            btnOk.focus();
        }
    });
}
