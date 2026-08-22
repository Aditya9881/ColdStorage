import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

// Mock next/link to render as an anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Breadcrumbs', () => {
  it('renders nothing for empty items', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single item as current page', () => {
    render(<Breadcrumbs items={[{ label: 'Dashboard' }]} />);
    const current = screen.getByText('Dashboard');
    expect(current).toBeInTheDocument();
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders links for non-last items with href', () => {
    render(
      <Breadcrumbs items={[
        { label: 'WMS', href: '/wms' },
        { label: 'Inventory', href: '/wms/inventory' },
        { label: 'LOT-001' },
      ]} />
    );

    // First two should be links
    const wmsLink = screen.getByText('WMS').closest('a');
    expect(wmsLink).toHaveAttribute('href', '/wms');

    const inventoryLink = screen.getByText('Inventory').closest('a');
    expect(inventoryLink).toHaveAttribute('href', '/wms/inventory');

    // Last should NOT be a link
    const lotLabel = screen.getByText('LOT-001');
    expect(lotLabel.tagName).toBe('SPAN');
    expect(lotLabel).toHaveAttribute('aria-current', 'page');
  });

  it('renders separators between items', () => {
    const { container } = render(
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users' },
      ]} />
    );

    // Each non-last item should have a separator (ChevronRight renders as svg)
    const separators = container.querySelectorAll('svg');
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });

  it('has proper WAI-ARIA nav landmark', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
  });

  it('renders home icon when showHome=true', () => {
    render(
      <Breadcrumbs
        showHome
        items={[{ label: 'Settings' }]}
      />
    );

    const homeLink = screen.getByLabelText('Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('does not render home icon by default', () => {
    render(<Breadcrumbs items={[{ label: 'Settings' }]} />);
    expect(screen.queryByLabelText('Home')).toBeNull();
  });
});
