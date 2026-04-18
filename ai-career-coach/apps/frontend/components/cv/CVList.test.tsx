import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVList from './CVList';
import type { CV } from '../../types/cv.types';

vi.mock('../../services/cv.service', () => ({
  cvService: {
    deleteCV: vi.fn().mockResolvedValue(undefined),
  },
}));

import { cvService } from '../../services/cv.service';

function buildCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-1',
    userId: 'user-1',
    filename: 'resume.pdf',
    fileUrl: '/uploads/resume.pdf',
    parsedData: null,
    analysisData: null,
    overviewData: null,
    isPrimary: false,
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
    ...overrides,
  };
}

function buildHandlers() {
  return {
    onCVSelect: vi.fn(),
    onCVDelete: vi.fn(),
    onCVUpdate: vi.fn(),
    onSetPrimary: vi.fn().mockResolvedValue(undefined),
  };
}

const twoOrMoreCVs = [
  buildCV({ id: 'cv-1', filename: 'resume-v1.pdf', isPrimary: false }),
  buildCV({ id: 'cv-2', filename: 'resume-v2.pdf', isPrimary: true }),
];

describe('CVList - visibility rules', () => {
  it('should render nothing when fewer than two CVs are provided', () => {
    const handlers = buildHandlers();
    const { container } = render(
      <CVList cvs={[buildCV()]} selectedCVId={undefined} {...handlers} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render the toggle button when two or more CVs are provided', () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    expect(screen.getByText(/CV History/i)).toBeInTheDocument();
  });

  it('should show the CV count in the toggle label', () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('should not show CV items before the list is expanded', () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    expect(screen.queryByText('resume-v1.pdf')).not.toBeInTheDocument();
  });
});

describe('CVList - expand / collapse', () => {
  it('should reveal CV filenames after clicking the toggle', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);

    await userEvent.click(screen.getByText(/CV History/i));

    expect(screen.getByText('resume-v1.pdf')).toBeInTheDocument();
    expect(screen.getByText('resume-v2.pdf')).toBeInTheDocument();
  });

  it('should hide CV items again after a second click on the toggle', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);

    const toggle = screen.getByText(/CV History/i);
    await userEvent.click(toggle);
    await userEvent.click(toggle);

    expect(screen.queryByText('resume-v1.pdf')).not.toBeInTheDocument();
  });
});

describe('CVList - item rendering', () => {
  beforeEach(async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));
  });

  it('should show the Primary badge for the primary CV', () => {
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('should show the Active badge for the selected CV', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId="cv-1" {...handlers} />);
    await userEvent.click(screen.getAllByText(/CV History/i)[1]);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should show a "Set as Primary" button for non-primary CVs', () => {
    expect(screen.getByRole('button', { name: /set as primary/i })).toBeInTheDocument();
  });

  it('should not show a "Set as Primary" button for the primary CV', () => {
    const setAsPrimaryButtons = screen.getAllByRole('button', { name: /set as primary/i });
    expect(setAsPrimaryButtons).toHaveLength(1);
  });

  it('should show a delete button for each CV', () => {
    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons).toHaveLength(2);
  });

  it('should display the score when overviewData is present', async () => {
    const cvWithScore = buildCV({
      id: 'cv-3',
      filename: 'cv-with-score.pdf',
      overviewData: {
        overallScore: 82,
        scoreBreakdown: {
          contentQuality: 80,
          formatStructure: 85,
          experienceClarity: 80,
          atsReadability: 83,
        },
        atsChecks: [],
        priorityIssues: [],
        recommendations: [],
        metadata: { wordCount: 400, sectionCount: 5 },
        analyzedAt: '2026-01-10T09:00:00.000Z',
      },
    });
    const handlers = buildHandlers();
    render(<CVList cvs={[buildCV(), cvWithScore]} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getAllByText(/CV History/i)[1]);
    expect(screen.getByText(/Score: 82\/100/)).toBeInTheDocument();
  });
});

describe('CVList - interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should call onCVSelect when clicking an unselected CV row', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));

    const firstRow = screen.getByText('resume-v1.pdf').closest('[class*="rounded-lg"]')!;
    await userEvent.click(firstRow);

    expect(handlers.onCVSelect).toHaveBeenCalledWith(twoOrMoreCVs[0]);
  });

  it('should not call onCVSelect when clicking the already-selected CV row', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId="cv-1" {...handlers} />);
    await userEvent.click(screen.getAllByText(/CV History/i)[0]);

    const firstRow = screen.getByText('resume-v1.pdf').closest('[class*="rounded-lg"]')!;
    await userEvent.click(firstRow);

    expect(handlers.onCVSelect).not.toHaveBeenCalled();
  });

  it('should call onSetPrimary with the CV id when "Set as Primary" is clicked', async () => {
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));

    await userEvent.click(screen.getByRole('button', { name: /set as primary/i }));

    await waitFor(() => {
      expect(handlers.onSetPrimary).toHaveBeenCalledWith('cv-1');
    });
  });

  it('should show an error message when onSetPrimary rejects', async () => {
    const handlers = buildHandlers();
    handlers.onSetPrimary = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));

    await userEvent.click(screen.getByRole('button', { name: /set as primary/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should call cvService.deleteCV and onCVDelete when delete is confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));

    const deleteButtons = screen.getAllByTitle('Delete');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(cvService.deleteCV).toHaveBeenCalledWith('cv-1');
      expect(handlers.onCVDelete).toHaveBeenCalledWith('cv-1');
    });
  });

  it('should not call cvService.deleteCV when delete is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    const handlers = buildHandlers();
    render(<CVList cvs={twoOrMoreCVs} selectedCVId={undefined} {...handlers} />);
    await userEvent.click(screen.getByText(/CV History/i));

    const deleteButtons = screen.getAllByTitle('Delete');
    await userEvent.click(deleteButtons[0]);

    expect(cvService.deleteCV).not.toHaveBeenCalled();
  });
});
