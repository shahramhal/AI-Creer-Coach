import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobMatchPagination } from './JobMatchPagination';

describe('JobMatchPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render anything when totalPages is 1', () => {
    const { container } = render(
      <JobMatchPagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render anything when totalPages is 0', () => {
    const { container } = render(
      <JobMatchPagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render Previous and Next buttons when there are multiple pages', () => {
    render(
      <JobMatchPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('should disable the Previous button on the first page', () => {
    render(
      <JobMatchPagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('should disable the Next button on the last page', () => {
    render(
      <JobMatchPagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('should enable both Previous and Next buttons on a middle page', () => {
    render(
      <JobMatchPagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('should call onPageChange with currentPage - 1 when Previous is clicked', async () => {
    const handlePageChange = vi.fn();
    render(
      <JobMatchPagination currentPage={3} totalPages={5} onPageChange={handlePageChange} />
    );
    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange with currentPage + 1 when Next is clicked', async () => {
    const handlePageChange = vi.fn();
    render(
      <JobMatchPagination currentPage={3} totalPages={5} onPageChange={handlePageChange} />
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it('should call onPageChange with the page number when a page button is clicked', async () => {
    const handlePageChange = vi.fn();
    render(
      <JobMatchPagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
    );
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('should show all page numbers when totalPages is 7 or fewer', () => {
    render(
      <JobMatchPagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('should show ellipsis when totalPages exceeds 7 and current page is in the middle', () => {
    render(
      <JobMatchPagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />
    );
    const ellipsisDots = screen.getAllByText('...');
    expect(ellipsisDots.length).toBeGreaterThan(0);
  });

  it('should always show the first and last page buttons', () => {
    render(
      <JobMatchPagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
  });
});
