import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column, type PaginationInfo } from '../DataTable';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Inbox: () => <svg data-testid="inbox-icon" />,
  ChevronLeft: () => <svg data-testid="chevron-left" />,
  ChevronRight: () => <svg data-testid="chevron-right" />,
}));

// Mock the Badge component
vi.mock('../Badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// Mock formatters
vi.mock('@/lib/formatters', () => ({
  getStatusLabel: (s: string) => s,
  getStatusColor: () => 'default',
}));

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const testColumns: Column<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

const testData: TestRow[] = [
  { id: '1', name: 'Item One', status: 'ACTIVE' },
  { id: '2', name: 'Item Two', status: 'PENDING' },
  { id: '3', name: 'Item Three', status: 'INACTIVE' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={testColumns} data={testData} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable columns={testColumns} data={testData} />);
    expect(screen.getByText('Item One')).toBeInTheDocument();
    expect(screen.getByText('Item Two')).toBeInTheDocument();
    expect(screen.getByText('Item Three')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading is true', () => {
    const { container } = render(<DataTable columns={testColumns} data={[]} loading={true} />);
    const shimmerBars = container.querySelectorAll('[class*="loadingBar"]');
    expect(shimmerBars.length).toBeGreaterThan(0);
  });

  it('shows empty message when data is empty', () => {
    render(<DataTable columns={testColumns} data={[]} emptyMessage="Nothing to show" />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });

  it('shows default empty message when none provided', () => {
    render(<DataTable columns={testColumns} data={[]} />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={testColumns} data={testData} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Item One'));
    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('renders custom column renderers', () => {
    const customColumns: Column<TestRow>[] = [
      { key: 'name', header: 'Name', render: (row) => <strong data-testid="bold-name">{row.name}</strong> },
      { key: 'status', header: 'Status' },
    ];
    render(<DataTable columns={customColumns} data={testData} />);
    const boldNames = screen.getAllByTestId('bold-name');
    expect(boldNames).toHaveLength(3);
    expect(boldNames[0].textContent).toBe('Item One');
  });

  it('does not render pagination when no pagination prop is provided', () => {
    const { container } = render(<DataTable columns={testColumns} data={testData} />);
    const pagination = container.querySelector('[class*="pagination"]');
    expect(pagination).toBeNull();
  });

  it('does not render pagination when totalPages is 1', () => {
    const pagination: PaginationInfo = {
      page: 1, limit: 20, total: 3, totalPages: 1,
      onPageChange: vi.fn(),
    };
    const { container } = render(<DataTable columns={testColumns} data={testData} pagination={pagination} />);
    const paginationEl = container.querySelector('[class*="pagination"]');
    expect(paginationEl).toBeNull();
  });

  it('renders pagination controls when totalPages > 1', () => {
    const onPageChange = vi.fn();
    const pagination: PaginationInfo = {
      page: 1, limit: 2, total: 6, totalPages: 3,
      onPageChange,
    };
    render(<DataTable columns={testColumns} data={testData.slice(0, 2)} pagination={pagination} />);
    expect(screen.getByText('1–2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = vi.fn();
    const pagination: PaginationInfo = {
      page: 1, limit: 2, total: 6, totalPages: 3,
      onPageChange,
    };
    render(<DataTable columns={testColumns} data={testData.slice(0, 2)} pagination={pagination} />);
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Previous button on first page', () => {
    const pagination: PaginationInfo = {
      page: 1, limit: 2, total: 6, totalPages: 3,
      onPageChange: vi.fn(),
    };
    render(<DataTable columns={testColumns} data={testData.slice(0, 2)} pagination={pagination} />);
    const prevBtn = screen.getByLabelText('Previous page');
    expect(prevBtn).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    const pagination: PaginationInfo = {
      page: 3, limit: 2, total: 6, totalPages: 3,
      onPageChange: vi.fn(),
    };
    render(<DataTable columns={testColumns} data={testData} pagination={pagination} />);
    const nextBtn = screen.getByLabelText('Next page');
    expect(nextBtn).toBeDisabled();
  });

  it('calls onLimitChange when page size is changed', () => {
    const onLimitChange = vi.fn();
    const pagination: PaginationInfo = {
      page: 1, limit: 10, total: 50, totalPages: 5,
      onPageChange: vi.fn(),
      onLimitChange,
    };
    render(<DataTable columns={testColumns} data={testData} pagination={pagination} />);
    const select = screen.getByDisplayValue('10 / page');
    fireEvent.change(select, { target: { value: '50' } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });
});
