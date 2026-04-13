import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobFilters } from './JobFilters';
import type { MatchFilters } from '@/types/matching.types';

const sampleCountries = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
];

function renderJobFilters(props: Partial<React.ComponentProps<typeof JobFilters>> = {}) {
  const defaults = {
    filters: {} as MatchFilters,
    onChange: vi.fn(),
    onApply: vi.fn(),
    isLoading: false,
    minScore: 0,
    onMinScoreChange: vi.fn(),
    countries: sampleCountries,
  };
  return render(<JobFilters {...defaults} {...props} />);
}

describe('JobFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Filters toggle button', () => {
    renderJobFilters();
    expect(screen.getByText(/Filters/)).toBeInTheDocument();
  });

  it('should not show filter fields before the header is clicked', () => {
    renderJobFilters();
    expect(screen.queryByLabelText(/country/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
  });

  it('should show the filter fields after clicking the Filters header button', async () => {
    renderJobFilters();
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('should show the City input after expanding', async () => {
    renderJobFilters();
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.getByPlaceholderText(/London, Manchester/i)).toBeInTheDocument();
  });

  it('should show the Title Keywords input after expanding', async () => {
    renderJobFilters();
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.getByPlaceholderText(/Software Engineer/i)).toBeInTheDocument();
  });

  it('should call onApply when the Apply Filters button is clicked', async () => {
    const handleApply = vi.fn();
    renderJobFilters({ onApply: handleApply });
    await userEvent.click(screen.getByText(/Filters/));
    await userEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    expect(handleApply).toHaveBeenCalledOnce();
  });

  it('should call onChange when the City input value changes', async () => {
    const handleChange = vi.fn();
    renderJobFilters({ onChange: handleChange });
    await userEvent.click(screen.getByText(/Filters/));
    await userEvent.type(screen.getByPlaceholderText(/London, Manchester/i), 'Manchester');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should call onChange when the Title Keywords input value changes', async () => {
    const handleChange = vi.fn();
    renderJobFilters({ onChange: handleChange });
    await userEvent.click(screen.getByText(/Filters/));
    await userEvent.type(screen.getByPlaceholderText(/Software Engineer/i), 'React');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should show the active filter count badge when filters are active', () => {
    renderJobFilters({ filters: { city: 'London' } as MatchFilters });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should include the minScore in the active filter count when it is above 0', () => {
    renderJobFilters({ minScore: 50 });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should not show the Reset button when no filters are active', async () => {
    renderJobFilters({ filters: {} as MatchFilters, minScore: 0 });
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('should show the Reset button when a filter is active', async () => {
    renderJobFilters({ filters: { city: 'London' } as MatchFilters });
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('should call onChange with empty filters and onMinScoreChange with 0 when Reset is clicked', async () => {
    const handleChange = vi.fn();
    const handleMinScoreChange = vi.fn();
    renderJobFilters({
      filters: { city: 'London' } as MatchFilters,
      onChange: handleChange,
      onMinScoreChange: handleMinScoreChange,
    });
    await userEvent.click(screen.getByText(/Filters/));
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(handleChange).toHaveBeenCalledWith({});
    expect(handleMinScoreChange).toHaveBeenCalledWith(0);
  });

  it('should disable the Apply Filters button when isLoading is true', async () => {
    renderJobFilters({ isLoading: true });
    await userEvent.click(screen.getByText(/Filters/));
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeDisabled();
  });
});
