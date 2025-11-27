# ComfyCommander (dc-clone)

## Project Overview
ComfyCommander (internal name: `dc-clone`) is a dual-panel file manager application built with **Electron**. It aims to replicate the functionality of classic file managers like Norton Commander or Total Commander, providing a keyboard-centric user experience for file operations.

### Key Architecture
The project follows a standard Electron architecture with strict context isolation:
*   **Main Process (`main.js`):** Handles application lifecycle, window creation, and native file system operations through a Virtual File System (VFS) abstraction.
*   **Renderer Process (`renderer.js`):** Manages the UI, state (active panel, file selections, focus), and user input handling.
*   **Preload Script (`preload.js`):** Exposes a safe API (`window.api`) to the renderer using `contextBridge` for IPC communication.
*   **VFS Layer (`lib/vfs/`):** Abstracts file system operations.
    *   `FileSystem.js`: Base class/interface.
    *   `NodeFileSystem.js`: Concrete implementation using Node's `fs` module.
    *   `MemoryFileSystem.js`: In-memory implementation for testing or safe environments.

## Building and Running

### Prerequisites
*   Node.js and npm installed.

### Commands
*   **Install Dependencies:** `npm install`
*   **Start Application:** `npm start` (Runs `electron .`)
*   **Run All Tests:** `npm test`
*   **Run Unit Tests:** `npm run test:unit` (Uses Mocha)
*   **Run UI Tests:** `npm run test:ui` (Uses Playwright)

## Development Conventions

### Coding Style
*   **JavaScript:** Vanilla JavaScript (CommonJS for main process, ES6+ for renderer).
*   **Styling:** Pure CSS (`styles.css`) without preprocessors.
*   **Async/Await:** Used extensively for asynchronous operations (IPC calls, file I/O).

### Architecture Patterns
*   **State Management:** The renderer uses a global `state` object to track the status of both panels (path, files list, focus, selection).
*   **IPC:** All file system operations are delegated to the main process via `ipcRenderer.invoke` and `ipcMain.handle`.
*   **VFS Abstraction:** File operations should go through the `vfs` instance in the main process to allow switching between real and memory file systems.

### Testing
*   **Requirement:** Any new feature or modification to an existing feature **must** be accompanied by a test.
    *   **UI Tests:** Required for any change that affects the user interface. Located in `test/ui/`. Use Playwright to simulate user interactions (clicks, keyboard navigation) within the Electron window.
    *   **Unit Tests:** Required for logic-only changes that do not touch the UI. Located in `test/unit/`. Focus on logic like VFS implementations.

## Key Files
*   `main.js`: Entry point. Sets up VFS and IPC handlers.
*   `renderer.js`: Core frontend logic (navigation, rendering, event handling).
*   `lib/vfs/NodeFileSystem.js`: Real file system interactions.
*   `index.html`: Main UI layout.
*   `styles.css`: Application styling.
