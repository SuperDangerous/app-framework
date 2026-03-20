import { fireEvent, render, screen } from '@testing-library/react';
import { AppCrashFallback } from '../components/base/AppCrashFallback';

describe('AppCrashFallback', () => {
  it('renders the supplied error content', () => {
    render(<AppCrashFallback title="Renderer failed" error={new Error('Kaboom')} onReload={() => undefined} />);

    expect(screen.getByText('Renderer failed')).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });

  it('invokes the reload callback', () => {
    const onReload = jest.fn();
    render(<AppCrashFallback onReload={onReload} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload Application' }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
