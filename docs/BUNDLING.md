# Desktop Bundling Guide

This guide explains how to bundle Node.js backend applications for Electron desktop deployment using the EpiSensor App Framework's bundling capabilities.

## Overview

The desktop bundling system allows you to:
- Bundle Node.js backends into optimized JavaScript bundles
- Handle native Node.js modules properly
- Integrate with Electron for cross-platform desktop apps
- Create truly offline-capable applications

## Quick Start

### 1. Install Dependencies

```bash
npm install @episensor/app-framework
npm install --save-dev electron electron-builder
```

### 2. Create Bundle Script

Create a `scripts/bundle-desktop.js` file:

```javascript
import { bundleBackend } from '@episensor/app-framework/desktop';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await bundleBackend({
  entryPoint: path.join(__dirname, '../dist/index.js'),
  outDir: path.join(__dirname, '../dist/backend'),
  appName: 'MyApp',
  version: '1.0.0',
  format: 'cjs',
  nativeModules: {
    autoDetect: true,
    modules: ['serialport'], // Additional native modules
    rebuild: false
  }
});
```

### 3. Add to package.json

```json
{
  "scripts": {
    "bundle:desktop": "node scripts/bundle-desktop.js"
  }
}
```

## Configuration Options

### BundleOptions

```typescript
interface BundleOptions {
  // Required
  entryPoint: string;      // Path to compiled JS entry point
  outDir: string;          // Output directory for bundle
  appName: string;         // Application name
  version: string;         // Application version

  // Optional
  platform?: 'node' | 'neutral';  // Target platform (default: 'node')
  target?: string;                 // Node version (default: 'node18')
  format?: 'cjs' | 'esm';         // Module format (default: 'cjs')
  minify?: boolean;                // Minify output (default: false)
  sourcemap?: boolean;             // Generate sourcemaps (default: false)
  external?: string[];             // Additional external modules
  env?: Record<string, string>;    // Environment variables to inject

  // Resources
  resources?: {
    config?: string;      // Config file to copy
    data?: string[];      // Data directories to create
  };

  // Native modules handling
  nativeModules?: {
    autoDetect?: boolean;   // Auto-detect native modules
    modules?: string[];     // Explicit native modules list
    rebuild?: boolean;      // Rebuild for target platform
  };
}
```

## Handling Native Modules

Native modules (like `serialport`, `bcrypt`, etc.) require special handling as they contain compiled binary code.

### Auto-Detection

The bundler can automatically detect native modules:

```javascript
{
  nativeModules: {
    autoDetect: true
  }
}
```

### Manual Specification

Or you can specify them manually:

```javascript
{
  nativeModules: {
    modules: ['serialport', '@serialport/bindings-cpp', 'bcrypt']
  }
}
```

### Common Native Modules

The framework handles these common native modules:
- `serialport` - Serial port communication
- `bcrypt` - Password hashing
- `better-sqlite3` - SQLite database
- `canvas` - Canvas rendering
- `sharp` - Image processing
- `node-pty` - Terminal emulation
- `usb` - USB device access
- `node-hid` - HID device access

## Electron Integration

### Main Process

The Electron main process spawns the backend as a child process:

```javascript
const { spawn } = require('child_process');

function startBackend() {
  const backendPath = path.join(app.getAppPath(), 'dist/backend/backend.js');

  backendProcess = spawn('node', [backendPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '8080',
      ELECTRON_RUNNING: 'true',
      DATA_DIR: app.getPath('userData'),
    },
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });
}
```

### Bundled Files Location

In the packaged Electron app:

```
YourApp.app/
└── Contents/
    └── Resources/
        └── app/
            ├── dist/
            │   └── backend/
            │       ├── backend.js      # Bundled backend
            │       └── start-backend.js
            ├── web/
            │   └── dist/              # Frontend build
            ├── electron/
            │   ├── main.cjs
            │   └── preload.cjs
            └── package.json
```

## Project Structure

Recommended project structure for Electron apps:

```
my-app/
├── src/                 # Backend source code
│   ├── index.ts        # Backend entry point
│   └── ...
├── web/                # Frontend code
│   ├── src/
│   └── dist/           # Built frontend
├── electron/           # Electron files
│   ├── main.cjs        # Main process
│   └── preload.cjs     # Preload script
├── dist/               # Compiled backend
│   └── backend/        # Bundled backend
│       └── backend.js
├── build/              # Build resources
│   └── entitlements.mac.plist
├── scripts/
│   └── bundle-desktop.js
├── electron-builder.json
└── package.json
```

## Complete Example

### 1. Backend Entry Point (`src/index.ts`)

```typescript
import { StandardServer } from '@episensor/app-framework';
import express from 'express';

const server = new StandardServer({
  appName: 'MyApp',
  port: parseInt(process.env.PORT || '8080'),
  enableWebSocket: true
});

const app = express();

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

await server.initialize(app);
await server.start();
```

### 2. Bundle Script (`scripts/bundle-desktop.js`)

```javascript
import { bundleBackend } from '@episensor/app-framework/desktop';
import { execSync } from 'child_process';

// Build TypeScript first
console.log('Building TypeScript...');
execSync('npm run build', { stdio: 'inherit' });

// Bundle for desktop
await bundleBackend({
  entryPoint: './dist/index.js',
  outDir: './dist/backend',
  appName: 'MyApp',
  version: '1.0.0',
  format: 'cjs',
  nativeModules: {
    autoDetect: true
  },
  resources: {
    config: './config',
    data: ['storage', 'logs']
  }
});

console.log('Desktop bundle created!');
```

### 3. electron-builder.json

```json
{
  "appId": "com.example.myapp",
  "productName": "MyApp",
  "files": [
    "dist/**/*",
    "web/dist/**/*",
    "electron/**/*",
    "package.json"
  ],
  "extraMetadata": {
    "main": "electron/main.cjs"
  }
}
```

### 4. Frontend Integration (`web/src/App.tsx`)

```typescript
import { useEffect, useState } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI) {
      window.electronAPI.getBackendStatus().then((status) => {
        setBackendStatus(status.running ? 'running' : 'stopped');
      });
    } else {
      setBackendStatus('browser');
    }
  }, []);

  return (
    <div>
      <h1>Desktop App</h1>
      <p>Backend: {backendStatus}</p>
    </div>
  );
}
```

## Troubleshooting

### Native Module Errors

If you get errors about missing native modules:

1. **Ensure modules are in externals**: Add to `external` array
2. **Rebuild if needed**: Use `rebuild: true` in native modules config
3. **Check node version**: Ensure compatible with Electron's Node version

### Bundle Size

To reduce bundle size:
- Enable minification: `minify: true`
- Exclude unnecessary modules
- Use tree-shaking where possible

### Path Issues

For path resolution issues:
- Use `process.cwd()` or `app.getAppPath()` for production paths
- Check `ELECTRON_RUNNING` environment variable
- Ensure paths are relative to bundle location

### Port Conflicts

Handle port conflicts gracefully:

```typescript
import { findAvailablePort } from '@episensor/app-framework';

const port = await findAvailablePort(8080, 8090);
process.env.PORT = port.toString();
```

## Development vs Production

Handle different environments:

```javascript
const isDev = process.env.NODE_ENV === 'development';

await bundleBackend({
  ...options,
  minify: !isDev,
  sourcemap: isDev,
  env: {
    NODE_ENV: isDev ? 'development' : 'production',
    DEBUG: isDev ? 'true' : 'false'
  }
});
```

## Best Practices

1. **Always compile TypeScript first** before bundling
2. **Test bundle locally** before shipping
3. **Include health checks** for backend monitoring
4. **Handle graceful shutdown** in backend code
5. **Use environment variables** for configuration
6. **Keep native modules minimal** to reduce complexity
7. **Version your bundles** for easier debugging
8. **Monitor bundle size** to ensure reasonable download sizes
