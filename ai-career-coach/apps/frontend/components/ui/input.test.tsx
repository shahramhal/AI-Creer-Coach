import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('should render an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display the placeholder text', () => {
    render(<Input placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('should update its value as the user types', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('should be disabled when the disabled prop is passed', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should call onChange when the user types', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should render as a password input when type="password" is set', () => {
    render(<Input type="password" />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('should accept a custom className and merge it with defaults', () => {
    render(<Input className="custom-input-class" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-input-class');
  });

  it('should display a controlled value', () => {
    render(<Input value="preset value" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('preset value');
  });
});
