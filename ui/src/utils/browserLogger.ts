declare const process:
  | {
      env?: {
        NODE_ENV?: string;
      };
    }
  | undefined;

export const browserLogLevels = ['debug', 'info', 'warn', 'error'] as const;

export type BrowserLogLevel = (typeof browserLogLevels)[number];

export interface BrowserLogEntry {
  level: BrowserLogLevel;
  message: string;
  timestamp: string;
  scope?: string;
  data?: unknown;
}

export interface BrowserLoggerOptions {
  scope?: string;
  level?: BrowserLogLevel;
  consoleOutput?: boolean;
  bufferSize?: number;
  sink?: (entry: BrowserLogEntry) => void;
}

export interface BrowserLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  child: (scope: string) => BrowserLogger;
  getRecentLogs: () => BrowserLogEntry[];
  clear: () => void;
  setLevel: (level: BrowserLogLevel) => void;
  getLevel: () => BrowserLogLevel;
}

interface BrowserLoggerState {
  level: BrowserLogLevel;
  buffer: BrowserLogEntry[];
  bufferSize: number;
  consoleOutput: boolean;
  sink?: (entry: BrowserLogEntry) => void;
}

const levelWeights: Record<BrowserLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveIsDevelopment(): boolean {
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;
  return nodeEnv !== 'production';
}

function resolveDefaultLevel(): BrowserLogLevel {
  return resolveIsDevelopment() ? 'debug' : 'info';
}

function normalizeScope(scope?: string): string | undefined {
  const trimmed = scope?.trim();
  return trimmed ? trimmed : undefined;
}

function joinScope(parentScope?: string, childScope?: string): string | undefined {
  const segments = [normalizeScope(parentScope), normalizeScope(childScope)].filter(
    (segment): segment is string => Boolean(segment),
  );
  return segments.length > 0 ? segments.join(':') : undefined;
}

function formatEntry(entry: BrowserLogEntry): string {
  const scope = entry.scope ? ` [${entry.scope}]` : '';
  return `${entry.timestamp} ${entry.level.toUpperCase()}${scope} ${entry.message}`;
}

function writeToConsole(entry: BrowserLogEntry): void {
  const formatted = formatEntry(entry);

  switch (entry.level) {
    case 'debug':
      console.debug(formatted, entry.data);
      return;
    case 'info':
      console.info(formatted, entry.data);
      return;
    case 'warn':
      console.warn(formatted, entry.data);
      return;
    case 'error':
      console.error(formatted, entry.data);
      return;
  }
}

class BrowserLoggerImpl implements BrowserLogger {
  constructor(
    private readonly state: BrowserLoggerState,
    private readonly scope?: string,
  ) {}

  private shouldLog(level: BrowserLogLevel): boolean {
    return levelWeights[level] >= levelWeights[this.state.level];
  }

  private record(level: BrowserLogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: BrowserLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      scope: this.scope,
      data,
    };

    this.state.buffer.push(entry);
    if (this.state.buffer.length > this.state.bufferSize) {
      this.state.buffer.shift();
    }

    if (this.state.consoleOutput) {
      writeToConsole(entry);
    }

    try {
      this.state.sink?.(entry);
    } catch {
      // Sink failures must not break renderer execution.
    }
  }

  debug(message: string, data?: unknown): void {
    this.record('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.record('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.record('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.record('error', message, data);
  }

  child(scope: string): BrowserLogger {
    return new BrowserLoggerImpl(this.state, joinScope(this.scope, scope));
  }

  getRecentLogs(): BrowserLogEntry[] {
    return [...this.state.buffer];
  }

  clear(): void {
    this.state.buffer.length = 0;
  }

  setLevel(level: BrowserLogLevel): void {
    this.state.level = level;
  }

  getLevel(): BrowserLogLevel {
    return this.state.level;
  }
}

export function createBrowserLogger(options: BrowserLoggerOptions = {}): BrowserLogger {
  const state: BrowserLoggerState = {
    level: options.level ?? resolveDefaultLevel(),
    buffer: [],
    bufferSize: options.bufferSize ?? 100,
    consoleOutput: options.consoleOutput ?? resolveIsDevelopment(),
    sink: options.sink,
  };

  return new BrowserLoggerImpl(state, normalizeScope(options.scope));
}

export function createScopedBrowserLogger(
  scope: string,
  options: Omit<BrowserLoggerOptions, 'scope'> = {},
): BrowserLogger {
  return createBrowserLogger({ ...options, scope });
}

export const browserLogger = createBrowserLogger();
