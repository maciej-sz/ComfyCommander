const state = {
    left: {
        path: '',
        files: [],
        selectedIndex: 0,
        element: document.getElementById('left-panel'),
        listElement: document.getElementById('left-list'),
        pathElement: document.getElementById('left-path')
    },
    right: {
        path: '',
        files: [],
        selectedIndex: 0,
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
        state[side].path = dirPath;
        // Add '..' if not root (simplification: assume length > 1 for root check or just always add and let backend handle parent of root)
        // Actually backend returning parent of / is / usually.
        
        const files = result.files;
        // Add parent directory entry manually for navigation
        files.unshift({ name: '..', isDirectory: true, path: await window.api.getParentDir(dirPath) });
        
        state[side].files = files;
        state[side].selectedIndex = 0;
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
        
        if (index === panel.selectedIndex) {
            div.classList.add('selected');
            // Scroll into view if needed
            // div.scrollIntoView({ block: 'nearest' }); 
            // (This might be annoying on initial load, let's do it only on move)
        }
        
        div.onclick = () => {
            setActivePanel(side);
            panel.selectedIndex = index;
            renderList(side);
        };
        
        div.ondblclick = () => {
            if (file.isDirectory) {
                loadDir(side, file.path);
            }
        };
        
        panel.listElement.appendChild(div);
    });
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
        if (panel.selectedIndex < panel.files.length - 1) {
            panel.selectedIndex++;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (panel.selectedIndex > 0) {
            panel.selectedIndex--;
            renderList(activeSide);
            ensureVisible(activeSide);
        }
    } else if (e.key === 'Home') {
        e.preventDefault();
        panel.selectedIndex = 0;
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'End') {
        e.preventDefault();
        panel.selectedIndex = Math.max(0, panel.files.length - 1);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageUp') {
        e.preventDefault();
        panel.selectedIndex = Math.max(0, panel.selectedIndex - PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'PageDown') {
        e.preventDefault();
        panel.selectedIndex = Math.min(panel.files.length - 1, panel.selectedIndex + PAGE_SIZE);
        renderList(activeSide);
        ensureVisible(activeSide);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const file = panel.files[panel.selectedIndex];
        if (file && file.isDirectory) {
            await loadDir(activeSide, file.path);
        }
    } else if (e.key === 'F5') {
        e.preventDefault();
        performCopy();
    }
});

function ensureVisible(side) {
    const panel = state[side];
    const el = panel.listElement.children[panel.selectedIndex];
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
    
    const file = sourcePanel.files[sourcePanel.selectedIndex];
    
    if (!file) return;
    if (file.name === '..') return; // Can't copy parent link
    
    // Simple confirmation
    const status = document.getElementById('status-bar');
    status.textContent = `Copying ${file.name}...`;
    
    const result = await window.api.copyFile(file.path, destPanel.path);
    
    if (result.success) {
        status.textContent = `Copied ${file.name} successfully.`;
        // Refresh dest panel
        await loadDir(destSide, destPanel.path);
    } else {
        status.textContent = `Error copying: ${result.error}`;
        alert(`Error: ${result.error}`);
    }
}

// Button listener
document.getElementById('copy-btn').addEventListener('click', performCopy);
