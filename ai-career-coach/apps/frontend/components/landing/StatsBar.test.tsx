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
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  useInView: () => true,
  useAnimation: () => ({}),
  useMotionValue: (initial: number) => initial,
  useTransform: (_value: any, _fn: any) => 0,
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

import { StatsBar } from './StatsBar';

describe('StatsBar', () => {
  it('should render the "Core AI Tools" stat label', () => {
    render(<StatsBar />);
    expect(screen.getByText('Core AI Tools')).toBeInTheDocument();
  });

  it('should render the "Integrated Services" stat label', () => {
    render(<StatsBar />);
    expect(screen.getByText('Integrated Services')).toBeInTheDocument();
  });

  it('should render the "Setup Time" stat label', () => {
    render(<StatsBar />);
    expect(screen.getByText('Setup Time')).toBeInTheDocument();
  });

  it('should render the "Free to Start" stat label', () => {
    render(<StatsBar />);
    expect(screen.getByText('Free to Start')).toBeInTheDocument();
  });

  it('should render with the id "stats" on the section', () => {
    const { container } = render(<StatsBar />);
    expect(container.querySelector('#stats')).toBeInTheDocument();
  });

  it('should render four stat items in total', () => {
    render(<StatsBar />);
    const statLabels = ['Core AI Tools', 'Integrated Services', 'Setup Time', 'Free to Start'];
    statLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
