/**
 * Desktop Module Exports
 * Provides all desktop-related utilities for Electron integration
 */

export * from "./bundler.js";
export * from "./native-modules.js";

// Re-export as namespace for convenience
import * as bundler from "./bundler.js";
import * as nativeModules from "./native-modules.js";

export const Desktop = {
  ...bundler,
  ...nativeModules,
};

export default Desktop;
