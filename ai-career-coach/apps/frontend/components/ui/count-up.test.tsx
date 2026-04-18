import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    // Suppress rendering of the MotionValue object as a child - render nothing
    // inside the span since the animated count value is not a plain React node.
    span: ({ className, ...props }: any) => (
      <span className={className} {...props} />
    ),
  },
  useMotionValue: (initial: number) => initial,
  useTransform: (_source: any, _transformFn: any) => 0,
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

import { CountUp } from './count-up';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CountUp', () => {
  it('should render without crashing', () => {
    const { container } = render(<CountUp value={100} />);
    expect(container).toBeInTheDocument();
  });

  it('should render a span element', () => {
    const { container } = render(<CountUp value={50} />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('should render the suffix text when provided', () => {
    render(<CountUp value={100} suffix="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should not render a suffix when none is provided', () => {
    const { container } = render(<CountUp value={100} />);
    expect(container.textContent).not.toContain('%');
    expect(container.textContent).not.toContain('+');
  });

  it('should apply a custom className to the span', () => {
    const { container } = render(<CountUp value={42} className="text-3xl" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('text-3xl');
  });

  it('should always include the tabular-nums class on the span', () => {
    const { container } = render(<CountUp value={42} />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('tabular-nums');
  });

  it('should render with a custom duration without throwing', () => {
    const { container } = render(<CountUp value={200} duration={3} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with value=0 without throwing', () => {
    const { container } = render(<CountUp value={0} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with a suffix and className together', () => {
    render(<CountUp value={99} suffix="k" className="font-bold" />);
    expect(screen.getByText('k')).toBeInTheDocument();
  });
});
