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

import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('should render the "Process" section label', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Process')).toBeInTheDocument();
  });

  it('should render the main heading', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/From upload to offer./i)).toBeInTheDocument();
  });

  it('should render the subheading', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Four simple steps.')).toBeInTheDocument();
  });

  it('should render all four step titles', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Upload your CV')).toBeInTheDocument();
    expect(screen.getByText('Get your analysis')).toBeInTheDocument();
    expect(screen.getByText('Discover matches')).toBeInTheDocument();
    expect(screen.getByText('Accelerate growth')).toBeInTheDocument();
  });

  it('should render all four step numbers', () => {
    render(<HowItWorks />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('should render the description for step 01', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/Drop your resume in any format/i)).toBeInTheDocument();
  });

  it('should render the description for step 02', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/comprehensive breakdown/i)).toBeInTheDocument();
  });

  it('should render the description for step 03', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/semantic engine finds roles/i)).toBeInTheDocument();
  });

  it('should render the description for step 04', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/personalized learning paths/i)).toBeInTheDocument();
  });

  it('should mount the section with id "how-it-works"', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('#how-it-works')).toBeInTheDocument();
  });
});
