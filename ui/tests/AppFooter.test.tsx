import { render, screen } from '@testing-library/react';
import { AppFooter } from '../components/layout/AppFooter';

describe('AppFooter', () => {
  it('renders the standard slot layout and status label', () => {
    render(
      <AppFooter
        leading={<span>Leading</span>}
        center={<span>Center</span>}
        trailing={<span>Trailing</span>}
        statusLabel="Connected"
        statusTone="success"
      />,
    );

    expect(screen.getByText('Leading')).toBeInTheDocument();
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Trailing')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('uses fixed positioning by default', () => {
    const { container } = render(<AppFooter statusLabel="Idle" />);
    expect(container.firstChild).toHaveClass('fixed');
    expect(container.firstChild).toHaveClass('bottom-0');
  });

  it('allows non-fixed rendering when requested', () => {
    const { container } = render(<AppFooter statusLabel="Idle" fixed={false} />);
    expect(container.firstChild).not.toHaveClass('fixed');
  });

  it('renders pulsing status indicator when requested', () => {
    render(<AppFooter statusLabel="Processing" statusTone="info" statusPulse />);
    expect(screen.getByTestId('app-footer-status').querySelector('.animate-ping')).not.toBeNull();
  });
});
