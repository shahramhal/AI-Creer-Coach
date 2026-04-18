import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    section: ({ children, className, id, ...props }: any) => (
      <section className={className} id={id} {...props}>{children}</section>
    ),
  },
  useInView: () => true,
  useAnimation: () => ({}),
}));

import { BentoShowcase } from './BentoShowcase';

describe('BentoShowcase', () => {
  it('should render the section label "Platform"', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('should render the main heading', () => {
    render(<BentoShowcase />);
    expect(screen.getByText(/Built for serious/i)).toBeInTheDocument();
  });

  it('should render the subheading "career moves."', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('career moves.')).toBeInTheDocument();
  });

  it('should render the "Deep CV Intelligence" card heading', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Deep CV Intelligence')).toBeInTheDocument();
  });

  it('should render the "Skills Detected" label in the CV card', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Skills Detected')).toBeInTheDocument();
  });

  it('should render the detected skill count badge', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('24 found')).toBeInTheDocument();
  });

  it('should render the skill tags', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('should render the ATS score', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('87/100')).toBeInTheDocument();
  });

  it('should render the experience level as "Senior"', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('should render the "Precision Matching" card heading', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Precision Matching')).toBeInTheDocument();
  });

  it('should render the match score percentages', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should render the "Top 3 matches" label', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Top 3 matches')).toBeInTheDocument();
  });

  it('should render the "Adaptive Learning" card heading', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Adaptive Learning')).toBeInTheDocument();
  });

  it('should render the learning benefit labels', () => {
    render(<BentoShowcase />);
    expect(screen.getByText('Curated courses')).toBeInTheDocument();
    expect(screen.getByText('Personalized paths')).toBeInTheDocument();
  });
});
