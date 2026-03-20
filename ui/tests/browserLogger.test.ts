import { createBrowserLogger, createScopedBrowserLogger } from '../src/utils/browserLogger';

describe('browserLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes entries to the shared buffer and console', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = createScopedBrowserLogger('App', { level: 'info', consoleOutput: true });

    logger.info('Loaded settings', { count: 2 });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO [App] Loaded settings'),
      { count: 2 },
    );
    expect(logger.getRecentLogs()).toMatchObject([
      {
        level: 'info',
        message: 'Loaded settings',
        scope: 'App',
        data: { count: 2 },
      },
    ]);
  });

  it('drops messages below the configured level', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const logger = createBrowserLogger({ level: 'warn', consoleOutput: true });

    logger.debug('Hidden debug log');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logger.getRecentLogs()).toHaveLength(0);
  });

  it('shares history across scoped child loggers', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logger = createScopedBrowserLogger('Root', { level: 'debug', consoleOutput: true });

    logger.child('IssuesPage').warn('Falling back to cached data');

    expect(warnSpy).toHaveBeenCalled();
    expect(logger.getRecentLogs()).toMatchObject([
      {
        level: 'warn',
        message: 'Falling back to cached data',
        scope: 'Root:IssuesPage',
      },
    ]);
  });

  it('keeps only the latest entries when the buffer is capped', () => {
    const logger = createBrowserLogger({ level: 'debug', consoleOutput: false, bufferSize: 2 });

    logger.info('one');
    logger.warn('two');
    logger.error('three');

    expect(logger.getRecentLogs().map((entry) => entry.message)).toEqual(['two', 'three']);
  });
});
