import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('fires onClick handler', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Save</Button>);
    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('shows icon when provided', () => {
    render(<Button icon={<span data-testid="btn-icon">⚡</span>}>Action</Button>);
    expect(screen.getByTestId('btn-icon')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('danger');
  });

  it('applies size class', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('lg');
  });

  it('applies fullWidth class', () => {
    const { container } = render(<Button fullWidth>Wide</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('fullWidth');
  });

  it('passes through native button attributes', () => {
    render(<Button type="submit" name="submit-btn">Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveAttribute('name', 'submit-btn');
  });
});
