import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogViewer, LogEntry, LogFile } from '../components/logs/LogViewer';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(
    (
      {
        data,
        itemContent,
      }: {
        data: LogEntry[];
        itemContent: (index: number, item: LogEntry) => React.ReactNode;
      },
      _ref
    ) => (
      <div data-testid="virtuoso-container">
        {data.map((item, index) => (
          <div key={item.id || index}>{itemContent(index, item)}</div>
        ))}
      </div>
    )
  ),
}));

jest.mock('../components/base/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/base/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    confirmLabel = 'Confirm',
    onConfirm,
  }: {
    open: boolean;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => (open ? <button onClick={onConfirm}>{confirmLabel}</button> : null),
}));

describe('LogViewer', () => {
  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: '2024-01-13T10:00:00Z',
      level: 'info',
      message: 'Application started',
      source: 'app',
    },
    {
      id: '2',
      timestamp: '2024-01-13T10:00:01Z',
      level: 'error',
      message: 'Database connection failed',
      source: 'db',
    },
  ];

  const mockArchives: LogFile[] = [
    {
      name: 'app-2024-01-01.log',
      size: 1024,
      modified: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders logs and count', () => {
    render(<LogViewer logs={mockLogs} />);

    expect(screen.getByText('Application started')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText(/2 lines/)).toBeInTheDocument();
  });

  it('filters logs by search term', async () => {
    render(<LogViewer logs={mockLogs} enableSearch={true} />);

    fireEvent.change(screen.getByPlaceholderText('Search logs...'), {
      target: { value: 'database' },
    });

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });
  });

  it('calls onFetchLogs on mount when provided', async () => {
    const onFetchLogs = jest.fn().mockResolvedValue(mockLogs);

    render(<LogViewer onFetchLogs={onFetchLogs} />);

    await waitFor(() => {
      expect(onFetchLogs).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onFetchArchives when switching to archives', async () => {
    const onFetchArchives = jest.fn().mockResolvedValue(mockArchives);

    render(<LogViewer logs={mockLogs} onFetchArchives={onFetchArchives} showArchives={true} />);

    fireEvent.click(screen.getByText('Archives'));

    await waitFor(() => {
      expect(onFetchArchives).toHaveBeenCalledTimes(1);
    });
  });

  it('clears logs through delete confirmation', async () => {
    const onClearLogs = jest.fn().mockResolvedValue(undefined);

    render(<LogViewer logs={mockLogs} onClearLogs={onClearLogs} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]!);

    await waitFor(() => {
      expect(onClearLogs).toHaveBeenCalledTimes(1);
    });
  });

  it('copies logs to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<LogViewer logs={mockLogs} enableCopy={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
  });
});
