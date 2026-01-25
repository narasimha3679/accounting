# Design System Rules (FinTech Luxury)

All UI development must adhere to the [Design System Catalog](file:///c:/Users/venka/Documents/scripts/accounting/corporate%20accounting/frontend/DESIGN_SYSTEM.md).

## Core Principles
- **Theme**: FinTech Luxury (Dark mode, glassmorphism, sophisticated aesthetic)
- **Base Background**: `bg-background` (Deep Forest: #020402)
- **Elevated Surfaces**: `bg-card` (Charcoal: #1a1a1a) with glass effect
- **Glassmorphism**: Use `.glass` classes for cards and overlays (20px blur, subtle border)

## Color Guidelines
- ✅ **DO**: Use semantic variables (`bg-background`, `text-foreground`, `bg-card`, `bg-primary`)
- ❌ **DON'T**: Use hardcoded colors or generic Tailwind colors (e.g., `bg-blue-500`)
- **Accent Emerald**: `#34d399` (used for growth/positive actions)
- **Accent Gold**: `#fbbf24` (used for wealth/premium features)

## Typography & Components
- **Numbers**: Always use `tabular-nums` class with 'JetBrains Mono' for financial data
- **Primary UI Components**: Use components from `src/components/ui/` (Button, Card, StatCard)
- **Accessibility**: Ensure WCAG AA compliance and proper dark mode support for all components
