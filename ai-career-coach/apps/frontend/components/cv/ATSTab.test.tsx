import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ATSTab from './ATSTab';
import type { ATSCheck } from '../../types/cv.types';

const passCheck: ATSCheck = {
  status: 'pass',
  title: 'Standard File Format',
  description: 'Your CV uses a widely compatible file format.',
};

const warningCheck: ATSCheck = {
  status: 'warning',
  title: 'Missing Phone Number',
  description: 'Consider adding a phone number for recruiters.',
};

const failCheck: ATSCheck = {
  status: 'fail',
  title: 'No Work Experience Section',
  description: 'ATS systems expect a clearly labelled experience section.',
};

describe('ATSTab - header', () => {
  it('should render the section heading', () => {
    render(<ATSTab checks={[]} />);
    expect(screen.getByText('ATS Compatibility Analysis')).toBeInTheDocument();
  });
});

describe('ATSTab - check items', () => {
  it('should render a pass check with its title and description', () => {
    render(<ATSTab checks={[passCheck]} />);
    expect(screen.getByText('Standard File Format')).toBeInTheDocument();
    expect(screen.getByText('Your CV uses a widely compatible file format.')).toBeInTheDocument();
  });

  it('should render a warning check', () => {
    render(<ATSTab checks={[warningCheck]} />);
    expect(screen.getByText('Missing Phone Number')).toBeInTheDocument();
    expect(screen.getByText('Consider adding a phone number for recruiters.')).toBeInTheDocument();
  });

  it('should render a fail check', () => {
    render(<ATSTab checks={[failCheck]} />);
    expect(screen.getByText('No Work Experience Section')).toBeInTheDocument();
  });

  it('should render all three check types when provided together', () => {
    render(<ATSTab checks={[passCheck, warningCheck, failCheck]} />);
    expect(screen.getByText('Standard File Format')).toBeInTheDocument();
    expect(screen.getByText('Missing Phone Number')).toBeInTheDocument();
    expect(screen.getByText('No Work Experience Section')).toBeInTheDocument();
  });

  it('should render an empty list without errors when checks is empty', () => {
    const { container } = render(<ATSTab checks={[]} />);
    const itemContainer = container.querySelector('.space-y-3');
    expect(itemContainer).toBeEmptyDOMElement();
  });
});

describe('ATSTab - status styling', () => {
  it('should apply a pass background class for a passing check', () => {
    const { container } = render(<ATSTab checks={[passCheck]} />);
    const checkRow = container.querySelector('.bg-metric-excellent\\/10');
    expect(checkRow).toBeInTheDocument();
  });

  it('should apply a warning background class for a warning check', () => {
    const { container } = render(<ATSTab checks={[warningCheck]} />);
    const checkRow = container.querySelector('.bg-warning\\/10');
    expect(checkRow).toBeInTheDocument();
  });

  it('should apply a destructive background class for a failing check', () => {
    const { container } = render(<ATSTab checks={[failCheck]} />);
    const checkRow = container.querySelector('.bg-destructive\\/10');
    expect(checkRow).toBeInTheDocument();
  });
});
