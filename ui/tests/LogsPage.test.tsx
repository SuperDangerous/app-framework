import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LogsPage } from '../components/logs/LogsPage';

const mockApiRequest = jest.fn();

jest.mock('../src/utils/apiRequest', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../components/logs/LogViewer', () => ({
  LogViewer: ({
    onFetchLogs,
    onFetchArchives,
  }: {
    onFetchLogs?: () => Promise<unknown>;
    onFetchArchives?: () => Promise<unknown>;
  }) => (
    <div data-testid="log-viewer">
      <button type="button" onClick={() => void onFetchLogs?.()}>
        Refresh logs
      </button>
      <button type="button" onClick={() => void onFetchArchives?.()}>
        Refresh archives
      </button>
    </div>
  ),
}));

describe('LogsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the standard support shell and loads logs data on mount', async () => {
    mockApiRequest.mockImplementation((endpoint: string) => {
      if (endpoint.endsWith('/entries')) {
        return Promise.resolve([
          {
            id: '1',
            timestamp: '2024-01-13T10:00:00Z',
            level: 'info',
            message: 'Application started',
          },
        ]);
      }

      if (endpoint.endsWith('/files')) {
        return Promise.resolve([
          {
            name: 'app-2024-01-01.log',
            size: 1024,
            modified: '2024-01-01T00:00:00Z',
          },
        ]);
      }

      if (endpoint.endsWith('/stats')) {
        return Promise.resolve({
          stats: {
            totalSize: 1024,
            totalSizeFormatted: '1 KB',
            fileCount: 1,
          },
        });
      }

      return Promise.resolve({});
    });

    render(<LogsPage apiUrl="/api/logs" />);

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('logs-live-count')).toHaveTextContent('1');
      expect(screen.getByTestId('logs-file-count')).toHaveTextContent('1 files');
      expect(screen.getByTestId('logs-total-size')).toHaveTextContent('1 KB');
    });

    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
  });

  it('runs archive maintenance through the shared logs router contract', async () => {
    mockApiRequest.mockImplementation((endpoint: string) => {
      if (endpoint.endsWith('/entries')) {
        return Promise.resolve([]);
      }

      if (endpoint.endsWith('/files')) {
        return Promise.resolve([]);
      }

      if (endpoint.endsWith('/stats')) {
        return Promise.resolve({
          stats: {
            totalSize: 0,
            totalSizeFormatted: '0 B',
            fileCount: 0,
          },
        });
      }

      if (endpoint.endsWith('/compact')) {
        return Promise.resolve({ message: 'Logs older than 7 days have been archived' });
      }

      return Promise.resolve({});
    });

    render(<LogsPage apiUrl="/api/logs" compactAfterDays={7} />);

    fireEvent.click(screen.getByRole('button', { name: 'Archive older logs' }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/logs/compact',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ days: 7 }),
        }),
      );
    });
  });
});
