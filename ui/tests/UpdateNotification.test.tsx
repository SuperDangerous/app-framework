import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UpdateNotification, UpdateSettings } from '../components/updates/UpdateNotification';

global.fetch = jest.fn();

describe('UpdateNotification', () => {
  const mockUpdateInfo = {
    currentVersion: '1.0.0',
    updateAvailable: true,
    latestRelease: {
      version: '2.0.0',
      name: 'Version 2.0.0 - Major Update',
      body: '## Changes\n- New feature\n- Bug fixes',
      url: 'https://github.com/user/repo/releases/tag/v2.0.0',
      publishedAt: '2024-01-13T10:00:00Z',
    },
    lastCheck: Date.now(),
  };

  const noUpdateInfo = {
    currentVersion: '1.0.0',
    updateAvailable: false,
    lastCheck: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    (global.open as any) = jest.fn();
  });

  it('checks for updates on mount and renders available update', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUpdateInfo,
    });

    render(<UpdateNotification />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/updates/check');
      expect(screen.getByText('Update Available: v2.0.0')).toBeInTheDocument();
    });
  });

  it('does not render when no update is available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => noUpdateInfo,
    });

    const { container } = render(<UpdateNotification />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('dismisses current version and persists dismissal', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUpdateInfo,
    });

    const { container } = render(<UpdateNotification />);

    await waitFor(() => {
      expect(screen.getByText('Update Available: v2.0.0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss update/i }));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    expect(localStorage.getItem('dismissedUpdateVersion')).toBe('2.0.0');
  });

  it('does not show a previously dismissed version', async () => {
    localStorage.setItem('dismissedUpdateVersion', '2.0.0');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUpdateInfo,
    });

    const { container } = render(<UpdateNotification />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('opens release page button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUpdateInfo,
    });

    render(<UpdateNotification />);

    await waitFor(() => {
      expect(screen.getByText('Update Available: v2.0.0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /open release page/i }));

    expect(global.open).toHaveBeenCalledWith(
      'https://github.com/user/repo/releases/tag/v2.0.0',
      '_blank'
    );
  });

  it('checks periodically when interval is configured', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => noUpdateInfo,
    });

    render(<UpdateNotification checkInterval={1000} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('UpdateSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.alert as any) = jest.fn();
  });

  it('renders update settings controls', () => {
    render(<UpdateSettings />);

    expect(screen.getByText('Automatic Updates')).toBeInTheDocument();
    expect(screen.getByText('Check for updates automatically')).toBeInTheDocument();
    expect(screen.getByText('Check Now')).toBeInTheDocument();
  });

  it('checks manually and reports update availability', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        updateAvailable: true,
        latestRelease: { version: '2.0.0' },
      }),
    });

    render(<UpdateSettings />);

    fireEvent.click(screen.getByText('Check Now'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/updates/check?force=true');
      expect(global.alert).toHaveBeenCalledWith('Update available: v2.0.0');
    });
  });
});
