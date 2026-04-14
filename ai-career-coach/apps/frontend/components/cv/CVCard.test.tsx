import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVCard from './CVCard';
import type { CV } from '../../types/cv.types';

function buildSampleCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-uuid-001',
    userId: 'user-uuid-abc',
    filename: 'my-resume.pdf',
    fileUrl: '/uploads/my-resume.pdf',
    parsedData: null,
    analysisData: null,
    overviewData: null,
    isPrimary: false,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function buildCVHandlers() {
  return {
    onView: vi.fn(),
    onSetPrimary: vi.fn().mockResolvedValue(undefined),
    onDownload: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CVCard - rendering', () => {
  it('should display the CV filename', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV()} {...handlers} />);
    expect(screen.getByText('my-resume.pdf')).toBeInTheDocument();
  });

  it('should display the upload date', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV({ createdAt: '2026-01-15T10:00:00.000Z' })} {...handlers} />);
    expect(screen.getByText(/15 Jan 2026/)).toBeInTheDocument();
  });

  it('should show "Primary" badge when isPrimary is true', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV({ isPrimary: true })} {...handlers} />);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('should not show "Primary" badge when isPrimary is false', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV({ isPrimary: false })} {...handlers} />);
    expect(screen.queryByText('Primary')).not.toBeInTheDocument();
  });

  it('should show the "Set as Primary" button when the CV is not primary', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV({ isPrimary: false })} {...handlers} />);
    expect(screen.getByRole('button', { name: /set as primary/i })).toBeInTheDocument();
  });

  it('should not show the "Set as Primary" button when the CV is already primary', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV({ isPrimary: true })} {...handlers} />);
    expect(screen.queryByRole('button', { name: /set as primary/i })).not.toBeInTheDocument();
  });

  it('should show the "Download" button', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV()} {...handlers} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('should show the "Delete" button', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV()} {...handlers} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should show "Selected" when isSelected is true', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV()} isSelected={true} {...handlers} />);
    expect(screen.getByRole('button', { name: /selected/i })).toBeInTheDocument();
  });

  it('should show "Select" when isSelected is false', () => {
    const handlers = buildCVHandlers();
    render(<CVCard cv={buildSampleCV()} isSelected={false} {...handlers} />);
    expect(screen.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
  });

  it('should display the parsed name when parsedData is available', () => {
    const handlers = buildCVHandlers();
    const cvWithParsedData = buildSampleCV({
      parsedData: {
        personal: { name: 'Jane Doe' },
        experience: [],
        education: [],
        skills: [],
      },
    });
    render(<CVCard cv={cvWithParsedData} {...handlers} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('should display the experience count when parsedData has experiences', () => {
    const handlers = buildCVHandlers();
    const cvWithExperience = buildSampleCV({
      parsedData: {
        personal: {},
        experience: [
          { company: 'Acme', title: 'Dev', startDate: '2020', responsibilities: [] },
          { company: 'Corp', title: 'Lead', startDate: '2022', responsibilities: [] },
        ],
        education: [],
        skills: [],
      },
    });
    render(<CVCard cv={cvWithExperience} {...handlers} />);
    expect(screen.getByText(/2 positions/)).toBeInTheDocument();
  });

  it('should display top 5 skills when parsedData has skills', () => {
    const handlers = buildCVHandlers();
    const cvWithSkills = buildSampleCV({
      parsedData: {
        personal: {},
        experience: [],
        education: [],
        skills: ['React', 'TypeScript', 'Node.js', 'CSS', 'GraphQL'],
      },
    });
    render(<CVCard cv={cvWithSkills} {...handlers} />);
    expect(screen.getByText(/React.*TypeScript.*Node\.js.*CSS.*GraphQL/)).toBeInTheDocument();
  });
});

describe('CVCard - interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onView with the CV when the "Select" button is clicked', async () => {
    const handlers = buildCVHandlers();
    const cv = buildSampleCV();
    render(<CVCard cv={cv} {...handlers} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    expect(handlers.onView).toHaveBeenCalledWith(cv);
  });

  it('should call onSetPrimary with the CV id when "Set as Primary" is clicked', async () => {
    const handlers = buildCVHandlers();
    const cv = buildSampleCV({ isPrimary: false });
    render(<CVCard cv={cv} {...handlers} />);

    await userEvent.click(screen.getByRole('button', { name: /set as primary/i }));

    await waitFor(() => {
      expect(handlers.onSetPrimary).toHaveBeenCalledWith('cv-uuid-001');
    });
  });

  it('should call onDownload with the CV id and filename when "Download" is clicked', async () => {
    const handlers = buildCVHandlers();
    const cv = buildSampleCV();
    render(<CVCard cv={cv} {...handlers} />);

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    await waitFor(() => {
      expect(handlers.onDownload).toHaveBeenCalledWith('cv-uuid-001', 'my-resume.pdf');
    });
  });

  it('should call onDelete with the CV id and filename when "Delete" is clicked', async () => {
    const handlers = buildCVHandlers();
    const cv = buildSampleCV();
    render(<CVCard cv={cv} {...handlers} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(handlers.onDelete).toHaveBeenCalledWith('cv-uuid-001', 'my-resume.pdf');
    });
  });
});
