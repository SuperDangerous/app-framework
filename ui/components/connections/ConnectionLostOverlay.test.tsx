import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConnectionLostOverlay } from './ConnectionLostOverlay';

describe('ConnectionLostOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not render when connected', () => {
    const { container } = render(<ConnectionLostOverlay isConnected={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows overlay after disconnect delay', () => {
    render(<ConnectionLostOverlay isConnected={false} />);

    expect(screen.queryByText('Connection Lost')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Connection Lost')).toBeInTheDocument();
  });

  it('hides overlay when connection is restored', () => {
    const { rerender } = render(<ConnectionLostOverlay isConnected={false} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Connection Lost')).toBeInTheDocument();

    rerender(<ConnectionLostOverlay isConnected={true} />);
    expect(screen.queryByText('Connection Lost')).toBeNull();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ConnectionLostOverlay isConnected={false} onRetry={onRetry} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: /retry now/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows retrying state after auto-retry timer', () => {
    render(<ConnectionLostOverlay isConnected={false} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/attempting to reconnect/i)).toBeInTheDocument();
  });

  it('renders troubleshooting guidance', () => {
    render(<ConnectionLostOverlay isConnected={false} appName="My Application" />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/if this problem persists/i)).toBeInTheDocument();
    expect(screen.getByText(/restarting my application/i)).toBeInTheDocument();
  });
});
