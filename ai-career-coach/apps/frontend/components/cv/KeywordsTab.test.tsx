import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeywordsTab from './KeywordsTab';
import type { MissingKeyword } from '../../types/cv.types';

const sampleKeywords: MissingKeyword[] = [
  { keyword: 'GraphQL', jobFrequency: '78%', section: 'Skills', impact: 'High' },
  { keyword: 'Docker', jobFrequency: '65%', section: 'Experience', impact: 'Medium' },
];

describe('KeywordsTab - heading', () => {
  it('should render the section heading', () => {
    render(<KeywordsTab keywords={[]} />);
    expect(screen.getByText('Missing Keywords for Target Role')).toBeInTheDocument();
  });
});

describe('KeywordsTab - empty state', () => {
  it('should show a success message when there are no missing keywords', () => {
    render(<KeywordsTab keywords={[]} />);
    expect(screen.getByText(/Your CV covers all major keywords/)).toBeInTheDocument();
  });

  it('should not render the table when there are no keywords', () => {
    render(<KeywordsTab keywords={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('KeywordsTab - table rendering', () => {
  it('should render the table when keywords are provided', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should render all column headers', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByText('Keyword')).toBeInTheDocument();
    expect(screen.getByText('Job Frequency')).toBeInTheDocument();
    expect(screen.getByText('Add to Section')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('should render each keyword as a table row', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('should display the job frequency for each keyword', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('should display the recommended section for each keyword', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
  });

  it('should display the impact badge for each keyword', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should render the correct number of keyword rows', () => {
    render(<KeywordsTab keywords={sampleKeywords} />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 2 data rows
    expect(rows).toHaveLength(3);
  });
});
