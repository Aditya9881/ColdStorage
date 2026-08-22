import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies padding class', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    const card = container.firstChild;
    expect((card as HTMLElement).className).toContain('pad-lg');
  });

  it('applies hover class when hover=true', () => {
    const { container } = render(<Card hover>Content</Card>);
    const card = container.firstChild;
    expect((card as HTMLElement).className).toContain('hover');
  });

  it('applies glow class when glow=true', () => {
    const { container } = render(<Card glow>Content</Card>);
    const card = container.firstChild;
    expect((card as HTMLElement).className).toContain('glow');
  });

  it('is clickable with role=button when onClick provided', () => {
    const handler = vi.fn();
    render(<Card onClick={handler}>Clickable</Card>);
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
    fireEvent.click(card);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('has no role=button without onClick', () => {
    render(<Card>Static</Card>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('accepts custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstChild;
    expect((card as HTMLElement).className).toContain('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="My Title" />);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<CardHeader title="Title" />);
    const p = container.querySelector('p');
    expect(p).toBeNull();
  });

  it('renders action slot', () => {
    render(
      <CardHeader
        title="Title"
        action={<button data-testid="action-btn">Add</button>}
      />
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });
});
