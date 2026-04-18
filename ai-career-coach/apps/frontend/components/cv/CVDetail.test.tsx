import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVDetail from './CVDetail';
import type { CV } from '../../types/cv.types';

// CVEditModal opens a dialog that needs Radix portal - keep it simple by mocking it
vi.mock('./CVEditModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="cv-edit-modal">
        <button onClick={onClose}>Close Edit</button>
      </div>
    ) : null,
}));

function buildCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-detail-1',
    userId: 'user-1',
    filename: 'my-resume.pdf',
    fileUrl: '/uploads/my-resume.pdf',
    parsedData: null,
    analysisData: null,
    overviewData: null,
    isPrimary: false,
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('CVDetail - basic rendering', () => {
  it('should display the CV filename in the header', () => {
    render(<CVDetail cv={buildCV()} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'my-resume.pdf' })).toBeInTheDocument();
  });

  it('should show the "Primary CV" label when isPrimary is true', () => {
    render(<CVDetail cv={buildCV({ isPrimary: true })} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText(/Primary CV/)).toBeInTheDocument();
  });

  it('should not show the "Primary CV" label when isPrimary is false', () => {
    render(<CVDetail cv={buildCV({ isPrimary: false })} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.queryByText(/Primary CV/)).not.toBeInTheDocument();
  });

  it('should render the "Edit CV" and "Close" buttons', () => {
    render(<CVDetail cv={buildCV()} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Edit CV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('CVDetail - parsedData sections', () => {
  const cvWithFullData = buildCV({
    parsedData: {
      personal: {
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '+44 7700 900000',
        location: 'London, UK',
        linkedin: 'linkedin.com/in/alice',
        github: 'github.com/alice',
      },
      summary: 'Experienced software engineer with a focus on web applications.',
      experience: [
        {
          company: 'Tech Ltd',
          title: 'Senior Developer',
          startDate: '2021-01',
          endDate: '2024-12',
          responsibilities: ['Led development', 'Mentored juniors'],
        },
      ],
      education: [
        {
          institution: 'University of London',
          degree: 'BSc Computer Science',
          field: 'Computer Science',
          endDate: '2020',
        },
      ],
      skills: ['TypeScript', 'React', 'Node.js'],
      certifications: [
        { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023-06' },
      ],
    },
  });

  it('should display the personal information section', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('should display the professional summary section', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText(/Experienced software engineer/)).toBeInTheDocument();
  });

  it('should display the experience section with company name', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Tech Ltd')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
  });

  it('should display the education section', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('University of London')).toBeInTheDocument();
  });

  it('should display all skills as individual badges', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('should display the certifications section', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('AWS Solutions Architect')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });

  it('should show a link for LinkedIn values', () => {
    render(<CVDetail cv={cvWithFullData} onClose={vi.fn()} onUpdate={vi.fn()} />);
    const linkedinLink = screen.getByRole('link', { name: 'linkedin.com/in/alice' });
    expect(linkedinLink).toBeInTheDocument();
  });

  it('should render no personal section when parsedData is null', () => {
    render(<CVDetail cv={buildCV({ parsedData: null })} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.queryByText('Personal Information')).not.toBeInTheDocument();
  });
});

describe('CVDetail - interactions', () => {
  it('should call onClose when the "Close" button is clicked', async () => {
    const onClose = vi.fn();
    render(<CVDetail cv={buildCV()} onClose={onClose} onUpdate={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should open the edit modal when "Edit CV" is clicked', async () => {
    render(<CVDetail cv={buildCV()} onClose={vi.fn()} onUpdate={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit CV' }));

    expect(screen.getByTestId('cv-edit-modal')).toBeInTheDocument();
  });

  it('should close the edit modal when the modal fires its close callback', async () => {
    render(<CVDetail cv={buildCV()} onClose={vi.fn()} onUpdate={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit CV' }));
    expect(screen.getByTestId('cv-edit-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close Edit' }));
    expect(screen.queryByTestId('cv-edit-modal')).not.toBeInTheDocument();
  });
});
