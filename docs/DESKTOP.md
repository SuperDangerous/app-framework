# Desktop Application Support

The App Framework provides comprehensive support for building desktop applications using Electron, with full backend bundling and external API access.

## Quick Start

### 1. Initialize Desktop Support

Copy the Electron templates from the framework:

```bash
# Copy electron files to your project
cp -r node_modules/@superdangerous/app-framework/desktop/electron/* ./electron/
```

Or manually create the following structure:
```
your-app/
├── electron/
│   ├── main.cjs       # Main process
│   └── preload.cjs    # Preload script
├── build/
│   └── entitlements.mac.plist
└── electron-builder.json
```

### 2. Install Dependencies

```bash
npm install --save-dev electron electron-builder wait-on concurrently
```

### 3. Add Scripts to package.json

```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:linux": "npm run build && electron-builder --linux",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### 4. Build Desktop App

```bash
npm run electron:build
```

This creates a self-contained application with:
- Bundled frontend (Vite build)
- Backend running via Node.js subprocess
- External API access on configured port
- Platform-specific installer

## Architecture

### Backend Process

The framework bundles your Node.js backend with esbuild:

```
src/index.ts → tsc → dist/index.js → esbuild → dist/backend/backend.js
```

In Electron, the main process spawns this as a child process:

```
Desktop App (Electron)
    ├── Main Process (Node.js)
    │   ├── Window management
    │   ├── IPC handlers
    │   └── Backend process spawning
    ├── Renderer (Chromium)
    │   └── React/Vue/Angular frontend
    └── Backend (Node.js subprocess)
        ├── Bundled backend.js
        ├── API Server (Express)
        └── WebSocket Server
```

### No Binary Compilation Needed

Unlike other frameworks, Electron includes Node.js, so:
- No need for `pkg` or native binary compilation
- Backend runs directly via `spawn('node', ['backend.js'])`
- Simpler build process

### External API Access

The backend API is accessible from outside the application:

```javascript
// Backend binds to all interfaces
app.listen(8080, '0.0.0.0', () => {
  console.log('API accessible at http://<any-ip>:8080');
});
```

## Configuration

### electron-builder.json

```json
{
  "appId": "com.yourcompany.yourapp",
  "productName": "Your App Name",
  "directories": {
    "output": "dist_electron",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "package.json"
  ],
  "extraMetadata": {
    "main": "electron/main.cjs"
  },
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": ["dmg", "zip"],
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist"
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}
```

### Environment Variables

The desktop app sets these environment variables for the backend:

```bash
NODE_ENV=production        # Production mode
ELECTRON_RUNNING=true      # Desktop app indicator
PORT=8080                  # API port
DATA_DIR=/path/to/appdata  # User data directory
```

## Data Storage

User data is stored in platform-specific locations:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/[appId]/` |
| Windows | `%APPDATA%/[appId]/` |
| Linux | `~/.config/[appId]/` |

Access in backend:
```javascript
const dataDir = process.env.DATA_DIR;
```

Access in renderer (via IPC):
```javascript
const appInfo = await window.electronAPI.getAppInfo();
// appInfo.dataDir contains the path
```

## IPC Communication

### Main Process (main.cjs)

```javascript
const { ipcMain } = require('electron');

// Handle requests from renderer
ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  apiUrl: `http://localhost:${API_PORT}`,
}));

// Send events to renderer
mainWindow.webContents.send('backend-ready', { port: API_PORT });
```

### Preload Script (preload.cjs)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  onBackendReady: (callback) => {
    ipcRenderer.on('backend-ready', (_, data) => callback(data));
  },
});
```

### Renderer (React/Vue)

```javascript
// Check if running in Electron
if (window.electronAPI) {
  const appInfo = await window.electronAPI.getAppInfo();
  console.log('Running in Electron:', appInfo.version);
}
```

## Development Workflow

### Development Mode

```bash
npm run electron:dev
```

This runs:
1. Vite dev server (frontend)
2. Waits for dev server to be ready
3. Launches Electron pointing to dev server
4. Backend runs from source with tsx

### Debugging

1. **Frontend**: DevTools open automatically in development
2. **Backend**: Logs written to console and `data/logs/`
3. **Main Process**: Use `--inspect` flag for debugging

```bash
# Debug main process
NODE_OPTIONS='--inspect=9229' npm run electron:dev
```

## Building for Distribution

### Build Commands

```bash
# macOS
npm run electron:build:mac

# Windows (from Windows)
npm run electron:build:win

# Linux
npm run electron:build:linux
```

### Code Signing

#### macOS

Set environment variables before building:

```bash
export APPLE_ID="your-apple-id"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="team-id"
npm run electron:build:mac
```

#### Windows

```bash
export CSC_LINK="path/to/certificate.pfx"
export CSC_KEY_PASSWORD="password"
npm run electron:build:win
```

### Output

Build output goes to `dist_electron/`:
- macOS: `.dmg`, `.zip`
- Windows: `Setup.exe`, `portable.exe`
- Linux: `.AppImage`, `.deb`

## Security

### Context Isolation

The preload script uses `contextIsolation: true`:

```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,
  nodeIntegration: false,
  webSecurity: true,
  sandbox: false,  // Required for backend spawning
}
```

### macOS Entitlements

The `build/entitlements.mac.plist` file enables:
- JIT compilation
- Network client/server capabilities
- Hardened runtime compatibility

### API Security

```javascript
// CORS configuration for Electron
corsOrigins.push('file://', 'null');

// Require authentication for all API routes
app.use('/api', authenticate);
```

## Troubleshooting

### Backend Not Starting

```bash
# Check logs in console
# Look for "[Backend]" or "[Backend Error]" prefixes

# Check port availability
lsof -i :8080
```

### Build Failures

```bash
# Clear electron-builder cache
rm -rf ~/Library/Caches/electron-builder

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Window Not Showing

Ensure `show: false` and `ready-to-show` event are used:

```javascript
mainWindow = new BrowserWindow({
  show: false,  // Don't show until ready
  // ...
});

mainWindow.once('ready-to-show', () => {
  mainWindow.show();
});
```

## Best Practices

1. **Use CommonJS for Electron files** - Use `.cjs` extension for main.cjs and preload.cjs
2. **Handle graceful shutdown** - Stop backend process on app quit
3. **Use IPC for communication** - Don't expose Node.js to renderer
4. **Bundle backend separately** - Keep frontend and backend builds separate
5. **Test on all platforms** - macOS, Windows, and Linux have different behaviors
