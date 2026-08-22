import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/ui/StatsCard';

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Total Users',
    value: 1234,
    icon: <span data-testid="icon">👤</span>,
  };

  it('renders title and value', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatsCard {...defaultProps} subtitle="Active: 900" />);
    expect(screen.getByText('Active: 900')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<StatsCard {...defaultProps} />);
    const subtitleEl = container.querySelector('.subtitle');
    // subtitle class should not exist or have no content
    expect(subtitleEl).toBeNull();
  });

  it('renders change indicator with positive value', () => {
    render(<StatsCard {...defaultProps} change={{ value: 12.5, label: 'vs last month' }} />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders change indicator with negative value', () => {
    render(<StatsCard {...defaultProps} change={{ value: -5, label: 'vs last week' }} />);
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(<StatsCard {...defaultProps} variant="warning" />);
    const card = container.firstChild;
    expect((card as HTMLElement)?.className).toContain('warning');
  });

  it('accepts string value', () => {
    render(<StatsCard {...defaultProps} value="₹1,25,000" />);
    expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
  });
});
