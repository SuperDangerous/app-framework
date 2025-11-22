/**
 * Unit tests for Startup Banner utility
 */

import { displayStartupBanner, StartupBannerOptions } from '../../../src/utils/startupBanner';
import * as fs from 'fs';
import chalk from 'chalk';

// Mock dependencies
vi.mock('fs');
vi.mock('chalk', () => {
  const chainableMock = {
    cyan: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    red: vi.fn((text) => text),
    gray: vi.fn((text) => text),
    white: vi.fn((text) => text),
    bold: {
      cyan: vi.fn((text) => text),
      green: vi.fn((text) => text),
      yellow: vi.fn((text) => text),
      blue: vi.fn((text) => text),
      red: vi.fn((text) => text),
      gray: vi.fn((text) => text),
      white: vi.fn((text) => text)
    },
    dim: vi.fn((text) => text),
    level: 3
  };
  return {
    default: chainableMock,
    ...chainableMock
  };
});

// Mock console.log
const originalConsoleLog = console.log;
const consoleLogSpy = vi.fn();

describe('displayStartupBanner', () => {
  const mockFs = fs as vi.Mocked<typeof fs>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = consoleLogSpy;
    
    // Default mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('basic banner display', () => {
    test('displays banner with app name and version', () => {
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080
      };
      
      displayStartupBanner(options);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('Test App');
      expect(output).toContain('1.0.0');
      expect(output).toContain('8080');
    });

    test('displays banner with description', () => {
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        description: 'A test application',
        port: 8080
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('A test application');
    });

    test('displays banner with web port', () => {
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080,
        webPort: 3000
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('8080');
      expect(output).toContain('3000');
    });

    test('displays banner with environment', () => {
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080,
        environment: 'production'
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('production');
    });

    test('displays banner with startup time', () => {
      const startTime = Date.now() - 1500; // Simulate 1500ms startup time
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080,
        startTime: startTime
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('1.5s');
    });

    test('uses default environment when not specified', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('test');
      
      process.env.NODE_ENV = originalEnv;
    });

    test('handles missing NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;
      
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('development'); // Default value
      
      process.env.NODE_ENV = originalEnv;
    });

    test('displays complete banner with all options', () => {
      const startTime = Date.now() - 2500; // Simulate 2500ms startup time
      const options: StartupBannerOptions = {
        appName: 'Complete Test App',
        appVersion: '2.5.0',
        description: 'Full featured test application',
        port: 8080,
        webPort: 3000,
        environment: 'staging',
        startTime: startTime
      };
      
      displayStartupBanner(options);
      
      const output = consoleLogSpy.mock.calls.join('\n');
      expect(output).toContain('Complete Test App');
      expect(output).toContain('2.5.0');
      expect(output).toContain('Full featured test application');
      expect(output).toContain('8080');
      expect(output).toContain('3000');
      expect(output).toContain('staging');
      expect(output).toContain('2.5s');
    });
  });

  describe('package.json reading', () => {
    test('handles invalid package.json gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const options: StartupBannerOptions = {
        appName: 'Test App',
        appVersion: '1.0.0',
        port: 8080
      };
      
      expect(() => displayStartupBanner(options)).not.toThrow();
    });
  });
});