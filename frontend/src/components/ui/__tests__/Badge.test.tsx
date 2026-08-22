import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(<Badge variant="danger">Error</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('danger');
  });

  it('applies size class', () => {
    const { container } = render(<Badge size="md">Large</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('md');
  });

  it('renders dot when dot=true', () => {
    const { container } = render(<Badge dot>Status</Badge>);
    const dots = container.querySelectorAll('span span');
    // Should have the dot span + text
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render dot by default', () => {
    const { container } = render(<Badge>Status</Badge>);
    // Only the outer span, no inner dot span
    const innerSpans = container.querySelectorAll('span > span');
    expect(innerSpans.length).toBe(0);
  });

  it('defaults to primary variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('primary');
  });
});
