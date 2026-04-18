import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillROITable from './SkillROITable';
import type { SkillROIEntry } from '../../types/salary.types';

function buildROIEntry(overrides: Partial<SkillROIEntry> = {}): SkillROIEntry {
  return {
    skill: 'React',
    avgSalaryIncrease: 8000,
    learningTime: '2 months',
    demandTrend: 90,
    priority: 'High',
    ...overrides,
  };
}

const sampleSkills: SkillROIEntry[] = [
  buildROIEntry({ skill: 'React', avgSalaryIncrease: 8000, learningTime: '2 months', demandTrend: 90, priority: 'High' }),
  buildROIEntry({ skill: 'TypeScript', avgSalaryIncrease: 6000, learningTime: '1 month', demandTrend: 85, priority: 'Medium' }),
  buildROIEntry({ skill: 'Docker', avgSalaryIncrease: 4000, learningTime: '3 weeks', demandTrend: 70, priority: 'Low' }),
];

describe('SkillROITable - empty state', () => {
  it('should render the section heading when skills array is empty', () => {
    render(<SkillROITable skills={[]} currency="$" />);
    expect(screen.getByText('Skill ROI Calculator')).toBeInTheDocument();
  });

  it('should prompt to upload a CV when skills is empty', () => {
    render(<SkillROITable skills={[]} currency="$" />);
    expect(screen.getByText(/Upload a CV to see skill-based salary insights/i)).toBeInTheDocument();
  });

  it('should not render a table when skills is empty', () => {
    render(<SkillROITable skills={[]} currency="$" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('SkillROITable - populated state', () => {
  it('should render the section heading', () => {
    render(<SkillROITable skills={sampleSkills} currency="$" />);
    expect(screen.getByText('Skill ROI Calculator')).toBeInTheDocument();
  });

  it('should render all expected column headers', () => {
    render(<SkillROITable skills={sampleSkills} currency="$" />);
    expect(screen.getByRole('columnheader', { name: /skill/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /avg. salary increase/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /learning time/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /demand trend/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /priority/i })).toBeInTheDocument();
  });

  it('should render each skill name', () => {
    render(<SkillROITable skills={sampleSkills} currency="$" />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('should render formatted salary increase with currency prefix', () => {
    render(<SkillROITable skills={[buildROIEntry({ avgSalaryIncrease: 8000 })]} currency="$" />);
    expect(screen.getByText('+$8k')).toBeInTheDocument();
  });

  it('should render the learning time for each skill', () => {
    render(<SkillROITable skills={sampleSkills} currency="$" />);
    expect(screen.getByText('2 months')).toBeInTheDocument();
    expect(screen.getByText('1 month')).toBeInTheDocument();
    expect(screen.getByText('3 weeks')).toBeInTheDocument();
  });

  it('should render the demand trend percentage', () => {
    render(<SkillROITable skills={[buildROIEntry({ demandTrend: 90 })]} currency="$" />);
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('should render priority badges', () => {
    render(<SkillROITable skills={sampleSkills} currency="$" />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should render the salary increase using the pound sign when currency is £', () => {
    render(<SkillROITable skills={[buildROIEntry({ avgSalaryIncrease: 6000 })]} currency="£" />);
    expect(screen.getByText('+£6k')).toBeInTheDocument();
  });
});
