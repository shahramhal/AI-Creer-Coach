import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVEditModal from './CVEditModal';
import type { CV } from '../../types/cv.types';

vi.mock('../../services/cv.service', () => ({
  cvService: {
    updateCV: vi.fn(),
  },
}));

import { cvService } from '../../services/cv.service';

function buildCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-edit-1',
    userId: 'user-1',
    filename: 'edit-me.pdf',
    fileUrl: '/uploads/edit-me.pdf',
    parsedData: null,
    analysisData: null,
    overviewData: null,
    isPrimary: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const cvWithParsedData = buildCV({
  parsedData: {
    personal: {
      name: 'Bob Jones',
      email: 'bob@example.com',
      phone: '+1 555 000 0000',
      location: 'New York, US',
    },
    summary: 'Seasoned backend developer.',
    experience: [
      {
        company: 'Acme Corp',
        title: 'Backend Engineer',
        startDate: '2020-03',
        endDate: '2024-01',
        responsibilities: ['Built APIs', 'Managed databases'],
      },
    ],
    education: [
      {
        institution: 'State University',
        degree: 'BSc Software Engineering',
        endDate: '2019',
      },
    ],
    skills: ['Python', 'Django', 'PostgreSQL'],
  },
});

describe('CVEditModal - dialog visibility', () => {
  it('should not render any visible content when isOpen is false', () => {
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByText('Edit CV')).not.toBeInTheDocument();
  });

  it('should display the modal heading when isOpen is true', () => {
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit CV')).toBeInTheDocument();
  });

  it('should display the CV filename in the dialog description', () => {
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('edit-me.pdf')).toBeInTheDocument();
  });
});

describe('CVEditModal - pre-populated fields', () => {
  it('should populate the Full Name field from parsedData', () => {
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Full Name')).toHaveValue('Bob Jones');
  });

  it('should populate the Email field from parsedData', () => {
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Email')).toHaveValue('bob@example.com');
  });

  it('should populate the Skills textarea with comma-separated skills', () => {
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const skillsTextarea = screen.getByLabelText(/Skills/i);
    expect(skillsTextarea).toHaveValue('Python, Django, PostgreSQL');
  });

  it('should show an existing experience entry with pre-filled Company field', () => {
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const companyInputs = screen.getAllByPlaceholderText('Tech Corp');
    expect(companyInputs[0]).toHaveValue('Acme Corp');
  });
});

describe('CVEditModal - dynamic fields', () => {
  it('should add a new experience entry when "+ Add Experience" is clicked', async () => {
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const addButton = screen.getByRole('button', { name: /add experience/i });
    await userEvent.click(addButton);

    expect(screen.getByPlaceholderText('Software Engineer')).toBeInTheDocument();
  });

  it('should add a new education entry when "+ Add Education" is clicked', async () => {
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const addButton = screen.getByRole('button', { name: /add education/i });
    await userEvent.click(addButton);

    expect(screen.getByPlaceholderText('University of Westminster')).toBeInTheDocument();
  });

  it('should remove an experience entry when "Remove Experience" is clicked', async () => {
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const removeButton = screen.getByRole('button', { name: /remove experience/i });
    await userEvent.click(removeButton);

    expect(screen.queryByPlaceholderText('Tech Corp')).not.toBeInTheDocument();
  });
});

describe('CVEditModal - form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call cvService.updateCV and onSave when the form is submitted successfully', async () => {
    const updatedCV = { ...cvWithParsedData, id: 'cv-edit-1' };
    vi.mocked(cvService.updateCV).mockResolvedValue({ data: updatedCV } as any);

    const onSave = vi.fn();
    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(cvService.updateCV).toHaveBeenCalledWith('cv-edit-1', expect.objectContaining({ parsedData: expect.any(Object) }));
      expect(onSave).toHaveBeenCalledWith(updatedCV);
    });
  });

  it('should show a server error message when updateCV rejects', async () => {
    vi.mocked(cvService.updateCV).mockRejectedValue(new Error('Server failure'));

    render(
      <CVEditModal
        cv={cvWithParsedData}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Server failure')).toBeInTheDocument();
    });
  });

  it('should call onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should show "Saving..." text on the submit button while submitting', async () => {
    vi.mocked(cvService.updateCV).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(
      <CVEditModal
        cv={buildCV()}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
  });
});
