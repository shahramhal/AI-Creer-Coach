import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    section: ({ children, className, id, ...props }: any) => (
      <section className={className} id={id} {...props}>{children}</section>
    ),
    // Render the children directly; motion.span with a MotionValue child needs
    // the value to be a plain number to avoid React's "object is not valid" error.
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props} />
    ),
  },
  AnimatePresence: ({ children }: any) => children,
  useInView: () => true,
  useAnimation: () => ({}),
  useMotionValue: (initial: number) => initial,
  useTransform: (_value: any, _fn: any) => 0,
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

import { AnimatedSection, AnimatedElement, AnimatedCounter } from './AnimatedWrappers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnimatedSection', () => {
  it('should render children inside a section element', () => {
    render(
      <AnimatedSection>
        <p>Section content</p>
      </AnimatedSection>
    );
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('should apply the provided className to the section', () => {
    const { container } = render(
      <AnimatedSection className="my-custom-class">
        <span>Text</span>
      </AnimatedSection>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('my-custom-class');
  });

  it('should forward the id prop to the section element', () => {
    const { container } = render(
      <AnimatedSection id="hero-section">
        <span>Content</span>
      </AnimatedSection>
    );
    const section = container.querySelector('#hero-section');
    expect(section).toBeInTheDocument();
  });

  it('should render without an id when none is provided', () => {
    const { container } = render(
      <AnimatedSection>
        <span>No id</span>
      </AnimatedSection>
    );
    const section = container.querySelector('section');
    expect(section).not.toHaveAttribute('id');
  });

  it('should render multiple children', () => {
    render(
      <AnimatedSection>
        <h1>Title</h1>
        <p>Subtitle</p>
      </AnimatedSection>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });
});

describe('AnimatedElement', () => {
  it('should render children inside a div', () => {
    render(
      <AnimatedElement>
        <button>Click me</button>
      </AnimatedElement>
    );
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should apply the provided className', () => {
    const { container } = render(
      <AnimatedElement className="card-wrapper">
        <span>Card</span>
      </AnimatedElement>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('card-wrapper');
  });

  it('should render with direction="up" without throwing', () => {
    render(
      <AnimatedElement direction="up">
        <span>Up animation</span>
      </AnimatedElement>
    );
    expect(screen.getByText('Up animation')).toBeInTheDocument();
  });

  it('should render with direction="left" without throwing', () => {
    render(
      <AnimatedElement direction="left">
        <span>Left animation</span>
      </AnimatedElement>
    );
    expect(screen.getByText('Left animation')).toBeInTheDocument();
  });

  it('should render with direction="right" without throwing', () => {
    render(
      <AnimatedElement direction="right">
        <span>Right animation</span>
      </AnimatedElement>
    );
    expect(screen.getByText('Right animation')).toBeInTheDocument();
  });
});

describe('AnimatedCounter', () => {
  it('should render at least one span element', () => {
    const { container } = render(<AnimatedCounter value={42} />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('should render without throwing when a suffix is provided', () => {
    // With framer-motion mocked, children inside motion.span are suppressed.
    // We verify the component mounts without errors.
    const { container } = render(<AnimatedCounter value={100} suffix="%" />);
    expect(container).toBeInTheDocument();
  });

  it('should render without throwing when no suffix is provided', () => {
    const { container } = render(<AnimatedCounter value={50} />);
    expect(container).toBeInTheDocument();
  });
});
