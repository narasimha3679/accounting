import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react'; // Direct import since we don't need providers
import { Button } from './Button';
import { Save } from 'lucide-react';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<Button icon={Save}>Save</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles isLoading state', () => {
    render(<Button isLoading>Loading...</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    // Check for spinner
    // Loader2 from lucide-react renders an svg with class animate-spin (based on my implementation)
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not render icon when isLoading is true', () => {
     render(<Button icon={Save} isLoading>Save</Button>);
     const button = screen.getByRole('button');
     // Should have only one svg (the loader), assuming 'Save' icon is hidden.
     const svgs = button.querySelectorAll('svg');
     expect(svgs.length).toBe(1);
     expect(svgs[0]).toHaveClass('animate-spin');
  });
});
