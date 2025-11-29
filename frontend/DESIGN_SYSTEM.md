# Design System Documentation

This document outlines the design system used in the Corporate Accounting application, inspired by Lean Clinic's modern, clean aesthetic.

## Design Principles

- **Clean & Modern**: Lots of white space, clean lines, and minimal clutter
- **Gradient Accents**: Soft gradients on cards and buttons for visual interest
- **Consistent Spacing**: Generous padding and margins throughout
- **Icon Integration**: Large, colorful icon backgrounds in rounded containers
- **Responsive**: Mobile-first approach maintained across all components
- **Accessibility**: Maintain contrast ratios and focus states

## Color Palette

### Primary Colors
- **Primary Blue**: Used for primary actions, links, and accents
  - `primary-50` to `primary-900` (standard Tailwind scale)
  - Primary gradient: `from-primary-600 to-primary-700`

### Accent Colors
The design system includes a rich palette of accent colors for different use cases:

#### Green (`accent.green`)
- Usage: Revenue, income, positive metrics, success states
- Gradient: `from-green-50 to-emerald-100`
- Icon background: `bg-green-200 text-green-700`

#### Blue (`accent.blue`)
- Usage: Information, neutral metrics, primary actions
- Gradient: `from-blue-50 to-indigo-100`
- Icon background: `bg-blue-200 text-blue-700`

#### Purple (`accent.purple`)
- Usage: Special metrics, premium features
- Gradient: `from-purple-50 to-violet-100`
- Icon background: `bg-purple-200 text-purple-700`

#### Orange (`accent.orange`)
- Usage: Warnings, alerts, pending states
- Gradient: `from-orange-50 to-amber-100`
- Icon background: `bg-orange-200 text-orange-700`

#### Emerald (`accent.emerald`)
- Usage: Success, completed states, positive outcomes
- Gradient: `from-emerald-50 to-green-100`
- Icon background: `bg-emerald-200 text-emerald-700`

#### Indigo (`accent.indigo`)
- Usage: Assets, resources, data visualization
- Gradient: `from-indigo-50 to-blue-100`
- Icon background: `bg-indigo-200 text-indigo-700`

#### Red (`accent.red`)
- Usage: Expenses, errors, negative metrics
- Gradient: `from-red-50 to-rose-100`
- Icon background: `bg-red-200 text-red-700`

#### Cyan (`accent.cyan`)
- Usage: Secondary metrics, informational content
- Gradient: `from-cyan-50 to-teal-100`
- Icon background: `bg-cyan-200 text-cyan-700`

#### Amber (`accent.amber`)
- Usage: Warnings, pending items, attention-needed states
- Gradient: `from-amber-50 to-yellow-100`
- Icon background: `bg-amber-200 text-amber-700`

## Typography

### Headings
Use semantic heading classes for consistent typography:

```tsx
<h1 className="heading-1">Main Page Title</h1>
<h2 className="heading-2">Section Title</h2>
<h3 className="heading-3">Subsection Title</h3>
```

### Text Gradients
For special emphasis, use gradient text:

```tsx
<h1 className="heading-1 text-gradient">Gradient Title</h1>
```

## Components

### Button Component

Located at: `frontend/src/components/ui/Button.tsx`

#### Usage

```tsx
import Button from '../components/ui/Button';

// Primary button
<Button variant="primary">Click Me</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Danger button
<Button variant="danger">Delete</Button>

// Button with icon
<Button variant="primary" icon={Plus} iconPosition="left">
  Add Item
</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

#### Props
- `variant`: `'primary' | 'secondary' | 'danger' | 'gradient'` (default: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `icon`: Lucide icon component (optional)
- `iconPosition`: `'left' | 'right'` (default: `'left'`)
- `gradientFrom`: Custom gradient start color (for gradient variant)
- `gradientTo`: Custom gradient end color (for gradient variant)
- All standard button HTML attributes

### Card Component

Located at: `frontend/src/components/ui/Card.tsx`

#### Usage

```tsx
import Card from '../components/ui/Card';

// Basic card
<Card>
  <p>Card content</p>
</Card>

// Card with gradient
<Card gradient="green">
  <p>Green gradient card</p>
</Card>

// Card with different padding
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding (default)</Card>
<Card padding="lg">Large padding</Card>

// Card without hover effect
<Card hover={false}>Static card</Card>
```

#### Props
- `gradient`: `'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'red' | 'cyan' | 'amber' | 'none'` (default: `'none'`)
- `padding`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `hover`: `boolean` (default: `true`)
- `className`: Additional CSS classes

### StatCard Component

Located at: `frontend/src/components/ui/StatCard.tsx`

Specialized card for displaying dashboard statistics with gradient backgrounds and icons.

#### Usage

```tsx
import StatCard from '../components/ui/StatCard';
import { DollarSign } from 'lucide-react';

<StatCard
  title="Total Revenue"
  value="$10,000.00"
  subtitle="From invoices & income"
  icon={DollarSign}
  gradient="green"
/>
```

#### Props
- `title`: `string` - The label for the statistic
- `value`: `string | number` - The main value to display
- `subtitle`: `string` (optional) - Additional context below the value
- `icon`: Lucide icon component - Icon to display
- `gradient`: `'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'red' | 'cyan' | 'amber'` - Color scheme
- `className`: Additional CSS classes

## Utility Classes

### Gradient Backgrounds

Use these utility classes for quick gradient backgrounds:

```tsx
<div className="gradient-green">Green gradient</div>
<div className="gradient-blue">Blue gradient</div>
<div className="gradient-purple">Purple gradient</div>
<div className="gradient-orange">Orange gradient</div>
<div className="gradient-emerald">Emerald gradient</div>
<div className="gradient-indigo">Indigo gradient</div>
<div className="gradient-red">Red gradient</div>
<div className="gradient-cyan">Cyan gradient</div>
<div className="gradient-amber">Amber gradient</div>
```

### Icon Containers

Pre-styled icon containers with matching colors:

```tsx
<div className="icon-container-green">
  <Icon className="h-6 w-6" />
</div>
```

Available: `icon-container-green`, `icon-container-blue`, `icon-container-purple`, `icon-container-orange`, `icon-container-emerald`, `icon-container-indigo`, `icon-container-red`, `icon-container-cyan`, `icon-container-amber`

### Shadows

- `shadow-soft`: Subtle shadow for elevated elements
- `shadow-card`: Standard card shadow
- `shadow-card-hover`: Enhanced shadow on hover

## Page Structure Guidelines

### Standard Page Layout

```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
    <div>
      <h1 className="heading-1">Page Title</h1>
      <p className="text-gray-600 mt-2">Page description</p>
    </div>
    <Button icon={Plus} iconPosition="left">
      Action Button
    </Button>
  </div>

  {/* Content */}
  <Card>
    {/* Page content */}
  </Card>
</div>
```

### Section Headings

Use consistent section headings:

```tsx
<h2 className="heading-2 border-b-2 border-primary-200 pb-3">
  Section Title
</h2>
```

## Creating New Pages

When creating a new page, follow these guidelines:

1. **Use semantic headings**: Always use `heading-1`, `heading-2`, `heading-3` classes
2. **Consistent spacing**: Use `space-y-6` or `space-y-8` for main page containers
3. **Card components**: Wrap content sections in `Card` components
4. **Button consistency**: Use the `Button` component for all actions
5. **Color coding**: 
   - Green for revenue/income/positive metrics
   - Red for expenses/negative metrics
   - Blue for neutral/informational content
   - Orange/Amber for warnings/alerts
   - Purple for special/premium features
6. **Responsive design**: Always test on mobile, tablet, and desktop
7. **Accessibility**: Ensure proper contrast ratios and focus states

## Example: Complete Page

```tsx
import React from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { Plus, DollarSign } from 'lucide-react';

const ExamplePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="heading-1">Example Page</h1>
          <p className="text-gray-600 mt-2">Page description here</p>
        </div>
        <Button icon={Plus} iconPosition="left">
          Add New
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid-mobile-4">
        <StatCard
          title="Total Revenue"
          value="$10,000.00"
          subtitle="This period"
          icon={DollarSign}
          gradient="green"
        />
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        <h2 className="heading-2 border-b-2 border-primary-200 pb-3">
          Content Section
        </h2>
        <Card>
          <p>Your content here</p>
        </Card>
      </div>
    </div>
  );
};

export default ExamplePage;
```

## Color Usage Guidelines

### When to Use Each Color

- **Green**: Revenue, income, profits, success states, completed items
- **Red**: Expenses, losses, errors, negative metrics, deletions
- **Blue**: Information, neutral data, primary actions, general content
- **Purple**: Special features, premium content, unique metrics
- **Orange**: Warnings, pending items, attention needed
- **Amber**: Alerts, important notices, pending states
- **Emerald**: Success confirmations, positive outcomes
- **Indigo**: Assets, resources, data visualization
- **Cyan**: Secondary metrics, informational content

## Best Practices

1. **Consistency**: Always use the design system components rather than custom styles
2. **Color coding**: Follow the color usage guidelines for semantic meaning
3. **Spacing**: Use consistent spacing utilities (`space-y-6`, `space-y-8`)
4. **Responsive**: Test all components on mobile, tablet, and desktop
5. **Accessibility**: Maintain WCAG contrast ratios and proper focus states
6. **Performance**: Use the provided components rather than recreating styles
7. **Documentation**: Update this document when adding new patterns

## Tailwind Configuration

The design system extends Tailwind's default configuration with:

- Custom color palette in `tailwind.config.js`
- Custom utility classes in `src/index.css`
- Extended border radius (`rounded-xl`, `rounded-2xl`)
- Custom shadows (`shadow-soft`, `shadow-card`, `shadow-card-hover`)

Refer to `frontend/tailwind.config.js` and `frontend/src/index.css` for implementation details.

