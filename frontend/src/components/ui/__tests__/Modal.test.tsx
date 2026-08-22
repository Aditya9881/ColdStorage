import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
  };

  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal {...defaultProps} isOpen={false}>
        <p>Content</p>
      </Modal>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and children when open', () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal body content</p>
      </Modal>,
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <Modal {...defaultProps} subtitle="A helpful description">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    render(
      <Modal {...defaultProps}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByText('A helpful description')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    // Click the overlay (outermost div)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open', () => {
    render(
      <Modal {...defaultProps}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll on unmount', () => {
    const { unmount } = render(
      <Modal {...defaultProps}>
        <p>Body</p>
      </Modal>,
    );
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('applies size class', () => {
    const { container } = render(
      <Modal {...defaultProps} size="lg">
        <p>Body</p>
      </Modal>,
    );
    // The modal div (second child inside overlay) should have the size class
    const overlay = container.firstChild as HTMLElement;
    const modal = overlay.firstChild as HTMLElement;
    expect(modal.className).toContain('lg');
  });

  it('defaults to md size', () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <p>Body</p>
      </Modal>,
    );
    const overlay = container.firstChild as HTMLElement;
    const modal = overlay.firstChild as HTMLElement;
    expect(modal.className).toContain('md');
  });

  it('renders footer when provided', () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render footer section when omitted', () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <p>Body</p>
      </Modal>,
    );
    const footers = container.querySelectorAll('.footer');
    expect(footers.length).toBe(0);
  });
});
