import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LearningPathTimeline from './LearningPathTimeline';
import type { LearningPhase, PhaseSkill } from '../../types/skillGap.types';

function buildPhaseSkill(name: string, estimatedHours: number): PhaseSkill {
  return {
    name,
    category: 'Programming',
    estimated_hours: estimatedHours,
    priority: 'high',
    roi_score: 0.9,
  };
}

function buildPhase(overrides: Partial<LearningPhase> = {}): LearningPhase {
  return {
    phase: 'Foundation',
    description: 'Core programming fundamentals',
    total_hours: 40,
    skills: [buildPhaseSkill('Python', 20), buildPhaseSkill('Git', 10)],
    ...overrides,
  };
}

describe('LearningPathTimeline - empty state', () => {
  it('should show the empty state message when phases array is empty', () => {
    render(<LearningPathTimeline phases={[]} />);
    expect(screen.getByText(/No learning path generated yet/i)).toBeInTheDocument();
  });

  it('should not render any phase cards when phases is empty', () => {
    render(<LearningPathTimeline phases={[]} />);
    expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
  });
});

describe('LearningPathTimeline - single phase', () => {
  const singlePhase = buildPhase();

  it('should render the phase name', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('Foundation')).toBeInTheDocument();
  });

  it('should render the phase description', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('Core programming fundamentals')).toBeInTheDocument();
  });

  it('should render the total hours for the phase', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('40h')).toBeInTheDocument();
  });

  it('should render a skills count badge', () => {
    const { container } = render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(container).toHaveTextContent('2 skills');
  });

  it('should render all skill names in the phase', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('should render each skill with its estimated hours', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('(20h)')).toBeInTheDocument();
    expect(screen.getByText('(10h)')).toBeInTheDocument();
  });

  it('should render the phase number starting at 1', () => {
    render(<LearningPathTimeline phases={[singlePhase]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('LearningPathTimeline - multiple phases', () => {
  const foundationPhase = buildPhase({
    phase: 'Foundation',
    description: 'Fundamentals',
    total_hours: 40,
    skills: [buildPhaseSkill('Python', 20)],
  });

  const intermediatePhase = buildPhase({
    phase: 'Intermediate',
    description: 'Build on foundations',
    total_hours: 60,
    skills: [buildPhaseSkill('Django', 30), buildPhaseSkill('REST APIs', 30)],
  });

  const advancedPhase = buildPhase({
    phase: 'Advanced',
    description: 'Expert-level skills',
    total_hours: 80,
    skills: [buildPhaseSkill('Microservices', 40)],
  });

  it('should render all three phases', () => {
    render(<LearningPathTimeline phases={[foundationPhase, intermediatePhase, advancedPhase]} />);
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('should render sequential phase numbers', () => {
    render(<LearningPathTimeline phases={[foundationPhase, intermediatePhase, advancedPhase]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render each phase with its own skill count', () => {
    const { container } = render(
      <LearningPathTimeline phases={[foundationPhase, intermediatePhase, advancedPhase]} />
    );
    expect(container).toHaveTextContent('1 skills');
    expect(container).toHaveTextContent('2 skills');
  });

  it('should show correct total hours for each phase', () => {
    render(<LearningPathTimeline phases={[foundationPhase, intermediatePhase]} />);
    expect(screen.getByText('40h')).toBeInTheDocument();
    expect(screen.getByText('60h')).toBeInTheDocument();
  });
});
