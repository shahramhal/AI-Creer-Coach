import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopPayingRoles from './TopPayingRoles';
import type { TopPayingRole } from '../../types/salary.types';

function buildRole(role: string, avgSalary: number): TopPayingRole {
  return { role, avgSalary };
}

const sampleRoles: TopPayingRole[] = [
  buildRole('Principal Engineer', 150000),
  buildRole('Staff Engineer', 140000),
  buildRole('Senior Engineer', 120000),
];

describe('TopPayingRoles - empty state', () => {
  it('should render the section heading when roles is empty', () => {
    render(<TopPayingRoles roles={[]} currency="$" />);
    expect(screen.getByText('Top-Paying Roles')).toBeInTheDocument();
  });

  it('should show "No role variant data available" when roles is empty', () => {
    render(<TopPayingRoles roles={[]} currency="$" />);
    expect(screen.getByText('No role variant data available')).toBeInTheDocument();
  });

  it('should not render a list when roles is empty', () => {
    render(<TopPayingRoles roles={[]} currency="$" />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('TopPayingRoles - populated state', () => {
  it('should render the section heading', () => {
    render(<TopPayingRoles roles={sampleRoles} currency="$" />);
    expect(screen.getByText('Top-Paying Roles')).toBeInTheDocument();
  });

  it('should render each role name', () => {
    render(<TopPayingRoles roles={sampleRoles} currency="$" />);
    expect(screen.getByText('Principal Engineer')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
  });

  it('should render formatted salaries with currency abbreviation', () => {
    render(<TopPayingRoles roles={sampleRoles} currency="$" />);
    expect(screen.getByText('$150k')).toBeInTheDocument();
    expect(screen.getByText('$140k')).toBeInTheDocument();
    expect(screen.getByText('$120k')).toBeInTheDocument();
  });

  it('should render numbered rank indicators starting at 1', () => {
    render(<TopPayingRoles roles={sampleRoles} currency="$" />);
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('should highlight the highest-paying role differently from others', () => {
    const { container } = render(<TopPayingRoles roles={sampleRoles} currency="$" />);
    const highlightedItem = container.querySelector('.bg-yellow-400\\/10');
    expect(highlightedItem).toBeInTheDocument();
  });

  it('should use pound currency abbreviation when currency is £', () => {
    render(<TopPayingRoles roles={[buildRole('CTO', 200000)]} currency="£" />);
    expect(screen.getByText('£200k')).toBeInTheDocument();
  });
});

describe('TopPayingRoles - single role', () => {
  it('should render a single role without error', () => {
    render(<TopPayingRoles roles={[buildRole('Engineer', 80000)]} currency="$" />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('$80k')).toBeInTheDocument();
  });
});
