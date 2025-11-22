/**
 * Jest Setup File (TypeScript)
 * Global test configuration using TestServer utility
 */

import { setupTestServer, teardownTestServer, getTestServer } from '../src/testing/TestServer';
import type { TestServer } from '../src/testing/TestServer';
import { beforeAll, afterAll, vi } from 'vitest';

// Global test configuration
global.API_BASE = 'http://localhost:5174';
global.TEST_TIMEOUT = 5000;

// Compatibility layer: alias jest -> vi for legacy tests/mocks
// vitest hoists vi.mock; providing requireActual/importMock aliases keeps old patterns working.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.jest = Object.assign(vi, {
  // provide requireActual/requireMock aliases
  requireActual: vi.importActual,
  requireMock: vi.importMock,
});

// Extend global namespace for TypeScript
declare global {
  var API_BASE: string;
  var TEST_TIMEOUT: number;
  var testUtils: {
    request: (endpoint: string, options?: any) => Promise<any>;
    getServer: () => TestServer | null;
  };
}

// Global setup for integration tests
const shouldStartServer = process.env.SKIP_TEST_SERVER !== '1';

beforeAll(async () => {
  if (!shouldStartServer) {
    return;
  }
  await setupTestServer({
    entryPoint: 'src/index.ts',
    port: 5174,
    apiBase: 'http://localhost:5174',
    healthEndpoint: '/api/health',
    startupTimeout: 15000,
    silent: true
  });
});

// Global teardown
afterAll(async () => {
  if (!shouldStartServer) {
    return;
  }
  await teardownTestServer();
});

// Global test utilities
global.testUtils = {
  // HTTP request helper using TestServer
  async request(endpoint: string, options: any = {}) {
    const server = getTestServer();
    if (!server) {
      throw new Error('Test server not initialized');
    }
    return server.request(endpoint, options);
  },
  
  // Get server instance
  getServer() {
    return getTestServer();
  }
};

export {};
