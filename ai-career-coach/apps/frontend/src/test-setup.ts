// Frontend test setup for Vitest + @testing-library/react
// Runs before every test file in the frontend suite.

import '@testing-library/jest-dom';

// Silence React 19 act() warnings that appear in test output
// when async state updates occur outside act(). These are noise,
// not failures, in our unit test context.
const originalError = console.error.bind(console);
beforeEach(() => {
  console.error = (...args: any[]) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('Warning: An update to') ||
        msg.includes('act(') ||
        msg.includes('not wrapped in act'))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
