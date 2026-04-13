import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVSummaryCard from './CVSummaryCard';
import type { CV } from '../../types/cv.types';

const buildCV = (overrides: Partial<CV> = {}): CV => ({
  id: 'cv-1',
  filename: 'my-resume.pdf',
  isPrimary: false,
  createdAt: '2024-03-10T12:00:00Z',
  analysisData: null,
  ...overrides,
} as CV);

describe('CVSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the filename', () => {
    render(<CVSummaryCard cv={buildCV()} />);
    expect(screen.getByText('my-resume.pdf')).toBeInTheDocument();
  });

  it('should show the "Latest Version" badge when isPrimary is true', () => {
    render(<CVSummaryCard cv={buildCV({ isPrimary: true })} />);
    expect(screen.getByText('Latest Version')).toBeInTheDocument();
  });

  it('should not show the "Latest Version" badge when isPrimary is false', () => {
    render(<CVSummaryCard cv={buildCV({ isPrimary: false })} />);
    expect(screen.queryByText('Latest Version')).not.toBeInTheDocument();
  });

  it('should display the score when analysisData has an overallScore', () => {
    render(
      <CVSummaryCard
        cv={buildCV({ analysisData: { overallScore: 78 } as any })}
      />
    );
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('should not display the score section when analysisData is null', () => {
    render(<CVSummaryCard cv={buildCV({ analysisData: null })} />);
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
  });

  it('should call onViewDetail with the CV object when "View Parsed Data" is clicked', async () => {
    const handleViewDetail = vi.fn();
    const cv = buildCV();
    render(<CVSummaryCard cv={cv} onViewDetail={handleViewDetail} />);

    await userEvent.click(screen.getByText('View Parsed Data'));
    expect(handleViewDetail).toHaveBeenCalledWith(cv);
  });

  it('should not show "View Parsed Data" when onViewDetail is not provided', () => {
    render(<CVSummaryCard cv={buildCV()} />);
    expect(screen.queryByText('View Parsed Data')).not.toBeInTheDocument();
  });

  it('should call onDownload with the cv id and filename when the download icon is clicked', async () => {
    const handleDownload = vi.fn().mockResolvedValue(undefined);
    const cv = buildCV({ id: 'cv-abc', filename: 'cv.pdf' });
    render(<CVSummaryCard cv={cv} onDownload={handleDownload} />);

    await userEvent.click(screen.getByTitle('Download CV'));

    await waitFor(() => {
      expect(handleDownload).toHaveBeenCalledWith('cv-abc', 'cv.pdf');
    });
  });

  it('should call onDelete after user confirmation when delete icon is clicked', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    window.confirm = vi.fn().mockReturnValue(true);

    const cv = buildCV({ id: 'cv-del', filename: 'old-cv.pdf' });
    render(<CVSummaryCard cv={cv} onDelete={handleDelete} />);

    await userEvent.click(screen.getByTitle('Delete CV'));

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('cv-del', 'old-cv.pdf');
    });
  });

  it('should not call onDelete when the user cancels the confirmation', async () => {
    const handleDelete = vi.fn();
    window.confirm = vi.fn().mockReturnValue(false);

    const cv = buildCV({ id: 'cv-del', filename: 'old-cv.pdf' });
    render(<CVSummaryCard cv={cv} onDelete={handleDelete} />);

    await userEvent.click(screen.getByTitle('Delete CV'));
    expect(handleDelete).not.toHaveBeenCalled();
  });
});
