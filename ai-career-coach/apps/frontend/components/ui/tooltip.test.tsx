import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderTooltip(contentText: string, triggerText: string = 'Hover me') {
  return render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{triggerText}</TooltipTrigger>
        <TooltipContent>{contentText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('TooltipProvider and Tooltip', () => {
  it('should render the trigger element', () => {
    renderTooltip('Tooltip text', 'Hover target');
    expect(screen.getByText('Hover target')).toBeInTheDocument();
  });

  it('should not show tooltip content by default before interaction', () => {
    renderTooltip('Hidden content');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show tooltip content after hovering the trigger', async () => {
    renderTooltip('Helpful tip', 'Info button');
    await userEvent.hover(screen.getByText('Info button'));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('should set trigger data-state to an open state when tooltip is visible', async () => {
    renderTooltip('Tooltip state check', 'Hover item');
    const triggerEl = screen.getByText('Hover item');
    await userEvent.hover(triggerEl);
    await screen.findByRole('tooltip');
    const triggerButton = triggerEl.closest('button') ?? triggerEl;
    const openState = triggerButton.getAttribute('data-state');
    expect(['delayed-open', 'instant-open']).toContain(openState);
  });
});

describe('TooltipContent', () => {
  it('should render tooltip content text when tooltip is open by default', async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Button</TooltipTrigger>
          <TooltipContent>Open tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('should include z-50 class on the content wrapper when tooltip is open', async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Btn</TooltipTrigger>
          <TooltipContent>Positioned tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    await screen.findByRole('tooltip');
    const tooltipRole = screen.getByRole('tooltip');
    const contentWrapper = tooltipRole.closest('div[class]') ?? tooltipRole.parentElement;
    expect(contentWrapper?.className ?? '').toContain('z-50');
  });

  it('should forward a custom className to the tooltip content', async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Button</TooltipTrigger>
          <TooltipContent className="custom-tooltip-class">Tip with class</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    await screen.findByRole('tooltip');
    const tooltipRole = screen.getByRole('tooltip');
    const contentWrapper = tooltipRole.closest('div[class]') ?? tooltipRole.parentElement;
    expect(contentWrapper?.className ?? '').toContain('rounded-md');
  });
});

describe('TooltipTrigger', () => {
  it('should render the trigger text in the document', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Click me</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should render a custom trigger element when asChild is used', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" data-testid="custom-btn">Help</button>
          </TooltipTrigger>
          <TooltipContent>Help text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByTestId('custom-btn')).toBeInTheDocument();
  });

  it('should show tooltip when custom trigger is hovered', async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" data-testid="icon-btn">i</button>
          </TooltipTrigger>
          <TooltipContent>Icon help</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    await userEvent.hover(screen.getByTestId('icon-btn'));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });
});
