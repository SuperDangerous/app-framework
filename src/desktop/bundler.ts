/**
 * Desktop Bundler Module
 * Handles bundling Node.js backends for Electron desktop applications
 */

import * as esbuild from "esbuild";
import {
  ensureDir,
  writeFile,
  stat,
  copy,
  move,
  remove,
  writeJson,
} from "../utils/fs-utils.js";
import path from "path";
import { execSync } from "child_process";
import { createLogger } from "../core/index.js";
import {
  detectNativeModules,
  copyNativeModules,
  createNativeModuleLoader,
} from "./native-modules.js";

const logger = createLogger("DesktopBundler");

export interface BundleOptions {
  entryPoint: string;
  outDir: string;
  appName: string;
  version: string;
  platform?: "node" | "neutral";
  target?: string;
  format?: "cjs" | "esm";
  minify?: boolean;
  sourcemap?: boolean;
  external?: string[];
  env?: Record<string, string>;
  resources?: {
    config?: string;
    data?: string[];
  };
  nativeModules?: {
    autoDetect?: boolean;
    modules?: string[];
    rebuild?: boolean;
  };
}

/**
 * Bundle a Node.js backend for desktop deployment
 */
export async function bundleBackend(options: BundleOptions): Promise<void> {
  const {
    entryPoint,
    outDir,
    appName,
    version,
    platform = "node",
    target = "node18",
    format = "cjs",
    minify = false,
    sourcemap = false,
    external = [],
    env = {},
    resources = {},
  } = options;

  logger.info(`Bundling backend for ${appName} v${version}`);

  // Ensure output directory exists
  await ensureDir(outDir);

  // Default externals for Node.js
  const defaultExternals = [
    "fsevents", // Mac-specific, optional
    "bufferutil", // Optional WebSocket performance
    "utf-8-validate", // Optional WebSocket validation
    "@episensor/app-framework/ui", // UI components not needed in backend
    "serialport", // Optional serial port support
    "@serialport/bindings-cpp", // Optional serial port bindings
    "@aws-sdk/client-s3", // Optional AWS S3 support
    "modbus-serial", // Optional Modbus communication
  ];

  // Build with esbuild
  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform,
    target,
    outfile: path.join(outDir, "backend.js"),
    format,
    minify,
    sourcemap,
    external: [...defaultExternals, ...external],
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.DESKTOP_MODE": '"true"',
      ...Object.entries(env).reduce(
        (acc, [key, value]) => {
          acc[`process.env.${key}`] = JSON.stringify(value);
          return acc;
        },
        {} as Record<string, string>,
      ),
    },
    loader: {
      ".node": "file",
      ".json": "json",
    },
    metafile: true,
    logLevel: "info",
  });

  // Write metafile for analysis
  await writeFile(
    path.join(outDir, "backend-meta.json"),
    JSON.stringify(result.metafile, null, 2),
  );

  // Create wrapper script
  const wrapperScript = generateWrapperScript(appName, format);
  await writeFile(path.join(outDir, "start-backend.js"), wrapperScript);

  // Copy resources
  if (resources.config) {
    const configDest = path.join(outDir, "config");
    await ensureDir(configDest);
    await copy(resources.config, path.join(configDest, "app.json"));
  }

  if (resources.data) {
    const dataDir = path.join(outDir, "data");
    for (const dir of resources.data) {
      await ensureDir(path.join(dataDir, dir));
    }
  }

  // Handle native modules if configured
  if (options.nativeModules) {
    const projectDir = path.dirname(entryPoint);

    // Detect native modules if requested
    let nativeModulesList = options.nativeModules.modules || [];
    if (options.nativeModules.autoDetect) {
      const detected = await detectNativeModules(projectDir);
      nativeModulesList = [...new Set([...nativeModulesList, ...detected])];
      logger.info(`Detected native modules: ${nativeModulesList.join(", ")}`);
    }

    // Copy native modules to output directory
    if (nativeModulesList.length > 0) {
      await copyNativeModules({
        modules: nativeModulesList,
        sourceDir: projectDir,
        targetDir: outDir,
        rebuild: options.nativeModules.rebuild,
      });

      // Create native module loader
      await createNativeModuleLoader(
        path.join(outDir, "native-loader.js"),
        nativeModulesList,
      );

      logger.info(`Copied ${nativeModulesList.length} native modules`);
    }
  }

  // Get bundle size
  const stats = await stat(path.join(outDir, "backend.js"));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  logger.info(`✅ Backend bundled successfully!`);
  logger.info(`   Bundle size: ${sizeMB} MB`);
  logger.info(`   Location: ${outDir}/backend.js`);
}

/**
 * Generate wrapper script for starting the bundled backend
 */
function generateWrapperScript(appName: string, format: "cjs" | "esm"): string {
  return `#!/usr/bin/env node

/**
 * Desktop App Backend Wrapper for ${appName}
 * Sets up environment and starts the bundled backend
 */

${format === "esm" ? "import { fileURLToPath } from 'url';" : ""}
${format === "esm" ? "import { dirname, join } from 'path';" : "const path = require('path');"}

${
  format === "esm"
    ? `
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    : ""
}

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DESKTOP_MODE = 'true';

// Set data directory to app data location
if (!process.env.DATA_DIR) {
  // In production, this will be set by Electron
  // For testing, use a local data directory
  process.env.DATA_DIR = ${format === "esm" ? "join" : "path.join"}(__dirname, 'data');
}

// Note: Using console.log in wrapper script as it runs in production without logger
console.log('Starting ${appName} Backend...');
console.log('Data directory:', process.env.DATA_DIR);

// Start the bundled backend
${format === "cjs" ? "require('./backend.js');" : "import('./backend.js');"}
`;
}

/**
 * Bundle dependencies separately for better caching
 */
export async function bundleDependencies(
  packageJsonPath: string,
  outDir: string,
): Promise<void> {
  const fs = await import("fs");
  const packageJson = JSON.parse(
    await fs.promises.readFile(packageJsonPath, "utf8"),
  );
  const dependencies = packageJson.dependencies || {};

  logger.info("Installing production dependencies...");

  // Create temporary directory for dependencies
  const tempDir = path.join(outDir, "temp");
  await ensureDir(tempDir);

  // Create minimal package.json
  const minimalPackage = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies,
  };

  await writeJson(path.join(tempDir, "package.json"), minimalPackage);

  // Install production dependencies
  execSync("npm install --production --no-audit --no-fund", {
    cwd: tempDir,
    stdio: "inherit",
  });

  // Move node_modules to output directory
  await move(
    path.join(tempDir, "node_modules"),
    path.join(outDir, "node_modules"),
    { overwrite: true },
  );

  // Clean up temp directory
  await remove(tempDir);
}

export default {
  bundleBackend,
  bundleDependencies,
};
