import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { z } from 'zod';
import ProfileForm from './ProfileForm';
import type { Profile } from '../../types/profile';

vi.mock('../../library/api', () => ({
  default: {
    put: vi.fn(),
  },
}));

import api from '../../library/api';

const mockApi = api as { put: ReturnType<typeof vi.fn> };

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  phoneNumber: '+44 7700 900000',
  location: 'London, UK',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  bio: 'Software engineer with 5 years of experience.',
  avatarUrl: null,
  jobTitle: 'Software Engineer',
  ...overrides,
} as Profile);

describe('ProfileForm', () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<ProfileForm profile={buildProfile()} onUpdate={onUpdate} />);

    expect(screen.getByPlaceholderText('+1 234 567 8900')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/linkedin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/github/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/portfolio/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tell us about yourself/i)).toBeInTheDocument();
  });

  it('should pre-populate fields with the given profile data', () => {
    render(
      <ProfileForm
        profile={buildProfile({ phoneNumber: '+1 555 1234', location: 'New York, NY' })}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByDisplayValue('+1 555 1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument();
  });

  it('should render the Save Profile submit button', () => {
    render(<ProfileForm profile={null} onUpdate={onUpdate} />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  it('should show a validation error for an invalid LinkedIn URL', () => {
    const profileSchema = z.object({
      linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')),
    });

    const result = profileSchema.safeParse({ linkedinUrl: 'not-a-url' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const linkedinError = result.error.issues.find(
        (issue) => issue.path[0] === 'linkedinUrl'
      );
      expect(linkedinError?.message).toBe('Invalid LinkedIn URL');
    }
  });

  it('should show a validation error for an invalid GitHub URL', () => {
    const profileSchema = z.object({
      githubUrl: z.string().url('Invalid GitHub URL').or(z.literal('')),
    });

    const result = profileSchema.safeParse({ githubUrl: 'bad-url' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const githubError = result.error.issues.find(
        (issue) => issue.path[0] === 'githubUrl'
      );
      expect(githubError?.message).toBe('Invalid GitHub URL');
    }
  });

  it('should call api.put and show success message on valid submission', async () => {
    mockApi.put.mockResolvedValue({ data: {} });
    render(<ProfileForm profile={buildProfile()} onUpdate={onUpdate} />);

    await userEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/profile',
        expect.objectContaining({ location: 'London, UK' })
      );
    });

    expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should show an error message when the API call fails', async () => {
    const axiosError = new axios.AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      { data: { message: 'Server error occurred' }, status: 500 } as any
    );
    mockApi.put.mockRejectedValue(axiosError);
    render(<ProfileForm profile={buildProfile()} onUpdate={onUpdate} />);

    await userEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText('Server error occurred')).toBeInTheDocument();
    });
  });
});
