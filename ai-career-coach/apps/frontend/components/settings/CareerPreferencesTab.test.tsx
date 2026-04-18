import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CareerPreferencesTab } from './CareerPreferencesTab';

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    getCareerPreferences: vi.fn().mockResolvedValue({
      targetRole: '',
      experienceLevel: '',
      targetCompanies: [],
      country: '',
      region: '',
      salaryMin: null,
      salaryMax: null,
      workArrangements: [],
      preferredJobTypes: [],
    }),
    updateCareerPreferences: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn().mockReturnValue({
    toasts: [],
    dismissToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}));

vi.mock('@/utils/locationData', () => ({
  COUNTRY_OPTIONS: [
    { value: 'GB', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
  ],
  LOCATION_OPTIONS: {
    GB: [
      { value: 'london', label: 'London' },
      { value: 'manchester', label: 'Manchester' },
    ],
  },
  JOB_TITLE_OPTIONS: ['Software Engineer', 'Product Manager', 'Data Scientist'],
}));

vi.mock('@/constants/options', () => ({
  EXPERIENCE_LEVEL_OPTIONS: [
    { value: 'junior', label: 'Junior', description: '0-2 years' },
    { value: 'mid', label: 'Mid', description: '2-5 years' },
    { value: 'senior', label: 'Senior', description: '5+ years' },
  ],
  WORK_ARRANGEMENT_OPTIONS: ['Remote', 'Hybrid', 'On-site'],
  JOB_TYPE_OPTIONS: ['Full-time', 'Part-time', 'Contract'],
}));

import { settingsService } from '@/services/settings.service';
import { useToast } from '@/hooks/useToast';

describe('CareerPreferencesTab - loading state', () => {
  it('should show a loading spinner initially', () => {
    const { container } = render(<CareerPreferencesTab />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('CareerPreferencesTab - form rendering', () => {
  it('should render the "Career Preferences" card after loading', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => {
      expect(screen.getByText('Career Preferences')).toBeInTheDocument();
    });
  });

  it('should render the Target Role label after loading', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => {
      expect(screen.getByText('Target Role')).toBeInTheDocument();
    });
  });

  it('should render salary min and max inputs', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
    });
  });

  it('should render work arrangement checkboxes', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => {
      expect(screen.getByText('Remote')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
      expect(screen.getByText('On-site')).toBeInTheDocument();
    });
  });

  it('should render job type checkboxes', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => {
      expect(screen.getByText('Full-time')).toBeInTheDocument();
      expect(screen.getByText('Part-time')).toBeInTheDocument();
    });
  });
});

describe('CareerPreferencesTab - company management', () => {
  it('should add a company tag when the Add button is clicked', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByPlaceholderText('Add company...'));

    await userEvent.type(screen.getByPlaceholderText('Add company...'), 'Google');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('should add a company tag when Enter is pressed in the input', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByPlaceholderText('Add company...'));

    await userEvent.type(screen.getByPlaceholderText('Add company...'), 'Netflix{Enter}');

    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('should not add a duplicate company tag', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByPlaceholderText('Add company...'));

    await userEvent.type(screen.getByPlaceholderText('Add company...'), 'Amazon');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await userEvent.type(screen.getByPlaceholderText('Add company...'), 'Amazon');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getAllByText('Amazon')).toHaveLength(1);
  });

  it('should remove a company tag when its remove button is clicked', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByPlaceholderText('Add company...'));

    await userEvent.type(screen.getByPlaceholderText('Add company...'), 'Meta');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText('Meta')).toBeInTheDocument();

    // The X button is the only button inside the badge
    const removeButton = screen.getByText('Meta').closest('[class*="gap-1"]')?.querySelector('button');
    await userEvent.click(removeButton!);

    expect(screen.queryByText('Meta')).not.toBeInTheDocument();
  });
});

describe('CareerPreferencesTab - work arrangement toggle', () => {
  it('should check the Remote checkbox when clicked', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByText('Remote'));

    const remoteCheckbox = screen.getByRole('checkbox', { name: /remote/i });
    expect(remoteCheckbox).not.toBeChecked();
    await userEvent.click(remoteCheckbox);
    expect(remoteCheckbox).toBeChecked();
  });

  it('should uncheck the Remote checkbox on a second click', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByText('Remote'));

    const remoteCheckbox = screen.getByRole('checkbox', { name: /remote/i });
    await userEvent.click(remoteCheckbox);
    await userEvent.click(remoteCheckbox);
    expect(remoteCheckbox).not.toBeChecked();
  });
});

describe('CareerPreferencesTab - salary validation', () => {
  it('should show an error when salaryMin exceeds salaryMax', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByPlaceholderText('Min'));

    await userEvent.type(screen.getByPlaceholderText('Min'), '90000');
    await userEvent.type(screen.getByPlaceholderText('Max'), '50000');
    await userEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(screen.getByText(/Minimum salary cannot exceed maximum/i)).toBeInTheDocument();
    });
  });
});

describe('CareerPreferencesTab - form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getCareerPreferences).mockResolvedValue({
      targetRole: '',
      experienceLevel: '',
      targetCompanies: [],
      country: '',
      region: '',
      salaryMin: null,
      salaryMax: null,
      workArrangements: [],
      preferredJobTypes: [],
    } as any);
  });

  it('should call settingsService.updateCareerPreferences on submit', async () => {
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByRole('button', { name: /save preferences/i }));

    await userEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(settingsService.updateCareerPreferences).toHaveBeenCalled();
    });
  });

  it('should show a success toast after successful save', async () => {
    const { showSuccessToast } = vi.mocked(useToast)();
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByRole('button', { name: /save preferences/i }));

    await userEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalled();
    });
  });

  it('should show an error toast when the save request fails', async () => {
    vi.mocked(settingsService.updateCareerPreferences).mockRejectedValue(new Error('Save error'));
    const { showErrorToast } = vi.mocked(useToast)();
    render(<CareerPreferencesTab />);
    await waitFor(() => screen.getByRole('button', { name: /save preferences/i }));

    await userEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled();
    });
  });
});
