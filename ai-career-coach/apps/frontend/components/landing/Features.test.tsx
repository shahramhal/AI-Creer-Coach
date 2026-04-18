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

import { Features } from './Features';

describe('Features', () => {
  it('should render the "Capabilities" section label', () => {
    render(<Features />);
    expect(screen.getByText('Capabilities')).toBeInTheDocument();
  });

  it('should render the main heading', () => {
    render(<Features />);
    expect(screen.getByText(/Everything you need to/i)).toBeInTheDocument();
  });

  it('should render the subheading text', () => {
    render(<Features />);
    expect(screen.getByText('land your next role.')).toBeInTheDocument();
  });

  it('should render the descriptor paragraph', () => {
    render(<Features />);
    expect(screen.getByText(/Five integrated tools/i)).toBeInTheDocument();
  });

  it('should render all five feature card headings', () => {
    render(<Features />);
    expect(screen.getByText('Smart CV Analysis')).toBeInTheDocument();
    expect(screen.getByText('ATS Score Optimization')).toBeInTheDocument();
    expect(screen.getByText('Semantic Job Matching')).toBeInTheDocument();
    expect(screen.getByText('Salary Insights')).toBeInTheDocument();
    expect(screen.getByText('Learning Paths')).toBeInTheDocument();
  });

  it('should render the Smart CV Analysis description', () => {
    render(<Features />);
    expect(screen.getByText(/Upload your CV and get instant/i)).toBeInTheDocument();
  });

  it('should render the ATS Score Optimization description', () => {
    render(<Features />);
    expect(screen.getByText(/applicant tracking systems/i)).toBeInTheDocument();
  });

  it('should render the Semantic Job Matching description', () => {
    render(<Features />);
    expect(screen.getByText(/beyond keywords/i)).toBeInTheDocument();
  });

  it('should render the Salary Insights description', () => {
    render(<Features />);
    expect(screen.getByText(/real market salary data/i)).toBeInTheDocument();
  });

  it('should render the Learning Paths description', () => {
    render(<Features />);
    expect(screen.getByText(/Personalized skill development/i)).toBeInTheDocument();
  });

  it('should mount the features section with the id "features"', () => {
    const { container } = render(<Features />);
    const featureDiv = container.querySelector('#features');
    expect(featureDiv).toBeInTheDocument();
  });
});
