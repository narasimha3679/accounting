# Testing Guide

This project uses a comprehensive testing setup with both unit/component tests and end-to-end (E2E) tests.

## Testing Stack

- **Vitest** - Fast unit and component testing (works seamlessly with Vite)
- **React Testing Library** - Component testing utilities
- **Playwright** - E2E testing with cross-browser support

## Running Tests

### Unit & Component Tests

```bash
# Run tests in watch mode (default)
npm run test

# Run tests with UI
npm run test:ui

# Run tests once with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Run All Tests

```bash
npm run test:all
```

## Writing Tests

### Unit/Component Tests

Create test files next to your components with the `.test.tsx` or `.test.ts` extension:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

Create E2E tests in the `e2e/` directory:

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
```

## Test Utilities

### Test Utils (`src/test/test-utils.tsx`)

Provides a custom `render` function that wraps components with all necessary providers (Router, QueryClient, AuthProvider).

### Test Setup (`src/test/setup.ts`)

Configures the testing environment, including:
- Jest DOM matchers
- Window.matchMedia mock
- Cleanup after each test

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The GitHub Actions workflow runs:
1. Unit/component tests with coverage
2. E2E tests across multiple browsers (Chromium, Firefox, WebKit)

## Best Practices

1. **Test user behavior, not implementation details**
2. **Use accessible queries** (getByRole, getByLabelText, etc.)
3. **Keep tests isolated** - each test should be independent
4. **Use descriptive test names** that explain what is being tested
5. **Mock external dependencies** (API calls, auth, etc.)
6. **Test error states and edge cases**

## Debugging Tests

### Vitest
- Use `console.log` or `debugger` statements
- Run with `--ui` flag for interactive debugging
- Use `--reporter=verbose` for detailed output

### Playwright
- Use `--headed` flag to see the browser
- Use `--debug` flag to step through tests
- Use `page.pause()` in your test code
- Check `playwright-report/` for detailed test reports

## Coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` in a browser to view detailed coverage information.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

