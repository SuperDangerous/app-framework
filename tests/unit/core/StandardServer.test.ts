/**
 * Unit tests for StandardServer
 */

// Mock winston-daily-rotate-file
vi.mock('winston-daily-rotate-file', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    log: vi.fn()
  }))
}));

// Mock dependencies BEFORE imports
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    listen: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };
  const expressMock: any = vi.fn(() => mockApp);
  const json = vi.fn(() => (req: any, res: any, next: any) => next());
  const urlencoded = vi.fn(() => (req: any, res: any, next: any) => next());
  const staticFn = vi.fn(() => (req: any, res: any, next: any) => next());
  const Router = vi.fn(() => ({}));
  expressMock.json = json;
  expressMock.urlencoded = urlencoded;
  expressMock.static = staticFn;
  expressMock.Router = Router;

  return {
    __esModule: true,
    default: expressMock,
    json,
    urlencoded,
    static: staticFn,
    Router
  };
});
vi.mock('http', () => {
  const createServer = vi.fn();
  return { createServer, default: { createServer } };
});
vi.mock('../../../src/services/websocketServer', () => ({
  createWebSocketServer: vi.fn()
}));
vi.mock('../../../src/utils/startupBanner', () => ({
  displayStartupBanner: vi.fn()
}));
vi.mock('../../../src/core/portUtils');
vi.mock('../../../src/core', async () => {
  const actual = await vi.importActual<typeof import('../../../src/core')>('../../../src/core');
  return {
    ...actual,
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }))
  };
});

import { StandardServer, StandardServerConfig } from '../../../src/core/StandardServer';
import express from 'express';
import { createServer } from 'http';
import { createWebSocketServer } from '../../../src/services/websocketServer';
import { displayStartupBanner } from '../../../src/utils/startupBanner';
import { getProcessOnPort } from '../../../src/core/portUtils';
import { createLogger } from '../../../src/core';

const mockApp = {
  use: vi.fn(),
  get: vi.fn(),
  listen: vi.fn(),
  set: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

const mockHttpServer: any = {
  listen: vi.fn((_port: number, _host: string, callback: Function) => {
    callback();
  }),
  close: vi.fn((callback?: Function) => {
    if (callback) callback();
  }),
  on: vi.fn(),
  address: vi.fn(() => ({ port: 8080, address: 'localhost' })),
  setTimeout: vi.fn(),
  requestTimeout: 0,
  headersTimeout: 0,
  keepAliveTimeout: 0
};

const mockWsServer = {
  close: vi.fn(),
  shutdown: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('StandardServer', () => {
  let servers: StandardServer[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    servers = [];

    (express as unknown as vi.Mock).mockReturnValue(mockApp);
    (createServer as vi.Mock).mockReturnValue(mockHttpServer);
    (createWebSocketServer as vi.Mock).mockResolvedValue(mockWsServer);
    (displayStartupBanner as vi.Mock).mockReturnValue(undefined);
    (getProcessOnPort as vi.Mock).mockResolvedValue(null);
    (createLogger as vi.Mock).mockReturnValue(mockLogger);

    // Reset default listen implementation between tests
    mockHttpServer.listen.mockImplementation(
      (_port: number, _host: string, callback: Function) => {
        callback();
      }
    );
  });

  afterEach(async () => {
    // Clean up all servers created during tests
    for (const server of servers) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    servers = [];
  });

  describe('constructor', () => {
    test('creates server with default config', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      expect(server).toBeDefined();
      expect(express).toHaveBeenCalled();
      expect(createServer).toHaveBeenCalledWith(mockApp);
    });

    test('creates server with custom config', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        description: 'Test application',
        port: 3000,
        host: '0.0.0.0',
        environment: 'production',
        enableWebSocket: false
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      expect(server).toBeDefined();
      expect(server['config'].port).toBe(3000);
      expect(server['config'].host).toBe('0.0.0.0');
      expect(server['config'].environment).toBe('production');
      expect(server['config'].enableWebSocket).toBe(false);
    });
  });

  describe('initialize', () => {
    test('initializes server successfully', async () => {
      const onInitialize = vi.fn().mockResolvedValue(undefined);
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        onInitialize
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();

      expect(onInitialize).toHaveBeenCalledWith(mockApp);
      expect(server['isInitialized']).toBe(true);
    });

    test('skips initialization if already initialized', async () => {
      const onInitialize = vi.fn();
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        onInitialize
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.initialize(); // Second call

      expect(onInitialize).toHaveBeenCalledTimes(1);
    });

    test('handles initialization errors', async () => {
      const onInitialize = vi.fn().mockRejectedValue(new Error('Init failed'));
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        onInitialize
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      await expect(server.initialize()).rejects.toThrow('Init failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    test('starts server successfully', async () => {
      const onStart = vi.fn().mockResolvedValue(undefined);
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        onStart
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();

      expect(mockHttpServer.listen).toHaveBeenCalledWith(
        8080,
        server['config'].host,
        expect.any(Function)
      );
      expect(displayStartupBanner).toHaveBeenCalled();
      expect(onStart).toHaveBeenCalled();
    });

    test('creates WebSocket server when enabled', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        enableWebSocket: true
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();

      expect(createWebSocketServer).toHaveBeenCalledWith(mockHttpServer);
      expect(server['wsServer']).toBe(mockWsServer);
    });

    test('skips WebSocket creation when disabled', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        enableWebSocket: false
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();

      expect(createWebSocketServer).not.toHaveBeenCalled();
      expect(server['wsServer']).toBeUndefined();
    });

    test('handles port conflicts', async () => {
      (getProcessOnPort as vi.Mock).mockResolvedValue({
        pid: 1234,
        command: 'node',
        port: 8080
      });

      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Port 8080 is already in use')
      );
    });

    test('starts with separate web port', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        port: 8080,
        webPort: 3000
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Web UI Port: 3000')
      );
    });

    test('handles start errors', async () => {
      mockHttpServer.listen.mockImplementation(() => {
        throw new Error('Listen failed');
      });

      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      
      await expect(server.start()).rejects.toThrow('Listen failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    test('stops server gracefully', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        enableWebSocket: true
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();
      await server.stop();

      expect(mockWsServer.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Server stopped gracefully');
    });

    test('handles stop when server not started', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.stop(); // Should not throw

      expect(mockHttpServer.close).toHaveBeenCalled();
    });

    test('handles stop errors', async () => {
      mockHttpServer.close.mockImplementation((callback?: Function) => {
        if (callback) callback(new Error('Close failed'));
      });

      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();
      
      await expect(server.stop()).rejects.toThrow('Close failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    test('getApp returns Express app', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      expect(server.getApp()).toBe(mockApp);
    });

    test('getServer returns HTTP server', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      expect(server.getServer()).toBe(mockHttpServer);
    });

    test('returns WebSocket server through private property', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        enableWebSocket: true
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();
      
      expect(server['wsServer']).toBe(mockWsServer);
    });

    test('does not create WebSocket when disabled', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0',
        enableWebSocket: false
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      expect(server['wsServer']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    test('handles server error events', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      
      // Simulate server error
      const errorHandler = mockHttpServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        const error = new Error('Server error');
        errorHandler(error);
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Server error:',
          error
        );
      }
    });
  });

  describe('signal handling', () => {
    test('registers shutdown handlers', () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const processSpy = vi.spyOn(process, 'on');
      
      const server = new StandardServer(config);
      servers.push(server);
      
      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      
      processSpy.mockRestore();
    });
  });

  describe('startup time tracking', () => {
    test('tracks start time', async () => {
      const config: StandardServerConfig = {
        appName: 'TestApp',
        appVersion: '1.0.0'
      };

      const server = new StandardServer(config);
      servers.push(server);
      await server.initialize();
      await server.start();
      
      expect(server['startTime']).toBeDefined();
      expect(server['startTime']).toBeGreaterThan(0);
    });
  });
});
