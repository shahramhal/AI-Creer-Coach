import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillGapCard from './SkillGapCard';
import type { MissingSkill } from '../../types/skillGap.types';

const buildSkill = (overrides: Partial<MissingSkill> = {}): MissingSkill => ({
  name: 'TypeScript',
  category: 'programming_language',
  priority: 'high',
  estimated_hours: 40,
  salary_impact: '+£5k',
  roi_score: 8.5,
  ...overrides,
});

describe('SkillGapCard', () => {
  it('should render the skill name', () => {
    render(<SkillGapCard skill={buildSkill({ name: 'Docker' })} />);
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('should render the priority badge', () => {
    render(<SkillGapCard skill={buildSkill({ priority: 'high' })} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('should render a medium priority badge', () => {
    render(<SkillGapCard skill={buildSkill({ priority: 'medium' })} />);
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('should render a low priority badge', () => {
    render(<SkillGapCard skill={buildSkill({ priority: 'low' })} />);
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('should render the category with underscores replaced by spaces', () => {
    render(<SkillGapCard skill={buildSkill({ category: 'programming_language' })} />);
    expect(screen.getByText('programming language')).toBeInTheDocument();
  });

  it('should render the estimated hours', () => {
    render(<SkillGapCard skill={buildSkill({ estimated_hours: 20 })} />);
    expect(screen.getByText('20h')).toBeInTheDocument();
  });

  it('should render the salary impact', () => {
    render(<SkillGapCard skill={buildSkill({ salary_impact: '+£8k' })} />);
    expect(screen.getByText('+£8k')).toBeInTheDocument();
  });

  it('should render the ROI score', () => {
    render(<SkillGapCard skill={buildSkill({ roi_score: 9.2 })} />);
    expect(screen.getByText('ROI 9.2')).toBeInTheDocument();
  });

  it('should render an info tooltip icon for the ROI metric', () => {
    const { container } = render(<SkillGapCard skill={buildSkill()} />);
    const infoIcon = container.querySelector('[title]');
    expect(infoIcon).toBeInTheDocument();
  });
});
