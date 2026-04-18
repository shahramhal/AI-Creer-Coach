import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MissingSkillsTable from './MissingSkillsTable';
import type { MissingSkillEntry } from '../../types/salary.types';

function buildSkill(
  skill: string,
  importance: 'High' | 'Medium' | 'Low',
  learnUrl = 'https://example.com'
): MissingSkillEntry {
  return { skill, importance, learnUrl };
}

const sampleSkills: MissingSkillEntry[] = [
  buildSkill('GraphQL', 'High'),
  buildSkill('Docker', 'Medium'),
  buildSkill('Kubernetes', 'Low'),
];

describe('MissingSkillsTable - empty state', () => {
  it('should render the section heading when skills array is empty', () => {
    render(<MissingSkillsTable skills={[]} />);
    expect(screen.getByText("Skills You're Missing")).toBeInTheDocument();
  });

  it('should prompt to upload a CV when skills is empty', () => {
    render(<MissingSkillsTable skills={[]} />);
    expect(screen.getByText(/Upload a CV to see which skills/i)).toBeInTheDocument();
  });

  it('should not render a table when skills is empty', () => {
    render(<MissingSkillsTable skills={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('MissingSkillsTable - populated state', () => {
  it('should render the section heading', () => {
    render(<MissingSkillsTable skills={sampleSkills} />);
    expect(screen.getByText("Skills You're Missing")).toBeInTheDocument();
  });

  it('should render the table with skill and importance columns', () => {
    render(<MissingSkillsTable skills={sampleSkills} />);
    expect(screen.getByRole('columnheader', { name: /skill/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /importance/i })).toBeInTheDocument();
  });

  it('should render each skill name as a table cell', () => {
    render(<MissingSkillsTable skills={sampleSkills} />);
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
  });

  it('should render importance badges for each skill', () => {
    render(<MissingSkillsTable skills={sampleSkills} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should render a "Learn" dropdown button for each skill', () => {
    render(<MissingSkillsTable skills={sampleSkills} />);
    const learnButtons = screen.getAllByRole('button', { name: /learn/i });
    expect(learnButtons).toHaveLength(3);
  });
});

describe('MissingSkillsTable - LearnDropdown interaction', () => {
  it('should open the dropdown when the Learn button is clicked', async () => {
    render(<MissingSkillsTable skills={[buildSkill('React', 'High')]} />);
    const learnButton = screen.getByRole('button', { name: /learn/i });
    await userEvent.click(learnButton);
    expect(screen.getByText('Udemy')).toBeInTheDocument();
    expect(screen.getByText('Coursera')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('should close the dropdown when a link is clicked', async () => {
    render(<MissingSkillsTable skills={[buildSkill('React', 'High')]} />);
    const learnButton = screen.getByRole('button', { name: /learn/i });
    await userEvent.click(learnButton);
    const udemyLink = screen.getByText('Udemy');
    await userEvent.click(udemyLink);
    expect(screen.queryByText('Coursera')).not.toBeInTheDocument();
  });

  it('should generate links containing the skill name as a query parameter', async () => {
    render(<MissingSkillsTable skills={[buildSkill('TypeScript', 'Medium')]} />);
    const learnButton = screen.getByRole('button', { name: /learn/i });
    await userEvent.click(learnButton);
    const udemyLink = screen.getByRole('link', { name: /udemy/i });
    expect(udemyLink).toHaveAttribute('href', expect.stringContaining('TypeScript'));
  });

  it('should not show dropdown options before the button is clicked', () => {
    render(<MissingSkillsTable skills={[buildSkill('Python', 'Low')]} />);
    expect(screen.queryByText('Udemy')).not.toBeInTheDocument();
  });
});
