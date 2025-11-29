# Design System Documentation

This document outlines the modern, semantic design system used in the Corporate Accounting application. It supports both light and dark modes and prioritizes accessibility and consistency.

## Core Principles

- **Semantic Colors**: Use functional color names (e.g., `primary`, `destructive`, `muted`) instead of hardcoded hex values.
- **Dark Mode First**: All components are designed to work seamlessly in both light and dark modes using Tailwind's `dark:` modifier.
- **Component-Based**: Use pre-built UI components (`Button`, `Card`, `StatCard`) to ensure consistency.
- **Standard Spacing**: Utilize standard Tailwind spacing (e.g., `p-4`, `p-6`, `gap-4`) instead of custom utility classes.

## Color Palette

The application uses a semantic color system defined in `tailwind.config.js` and `index.css`.

### Base Colors
- **Background**: `bg-background` (Page background)
- **Foreground**: `text-foreground` (Primary text color)
- **Card**: `bg-card` (Card background)
- **Card Foreground**: `text-card-foreground` (Card text color)
- **Popover**: `bg-popover` (Dropdown/Modal background)
- **Popover Foreground**: `text-popover-foreground` (Dropdown/Modal text color)
- **Primary**: `bg-primary` (Primary actions, active states)
- **Primary Foreground**: `text-primary-foreground` (Text on primary background)
- **Secondary**: `bg-secondary` (Secondary actions)
- **Secondary Foreground**: `text-secondary-foreground` (Text on secondary background)
- **Muted**: `bg-muted` (Subtle backgrounds)
- **Muted Foreground**: `text-muted-foreground` (Subtle text)
- **Accent**: `bg-accent` (Hover states, highlights)
- **Accent Foreground**: `text-accent-foreground` (Text on accent background)
- **Destructive**: `bg-destructive` (Error states, delete actions)
- **Destructive Foreground**: `text-destructive-foreground` (Text on destructive background)
- **Border**: `border-border` (Default border color)
- **Input**: `border-input` (Input field borders)
- **Ring**: `ring-ring` (Focus ring color)

## Typography

The application uses `Inter` as the primary font, falling back to system sans-serif fonts.

### Headings
Use standard Tailwind classes for headings:
- **H1**: `text-3xl font-bold tracking-tight`
- **H2**: `text-2xl font-semibold tracking-tight`
- **H3**: `text-xl font-semibold tracking-tight`

### Body Text
- **Default**: `text-base text-foreground`
- **Small**: `text-sm text-muted-foreground`
- **Large**: `text-lg font-medium`

## Components

### Button
Located at: `src/components/ui/Button.tsx`

```tsx
import { Button } from "@/components/ui/Button"
import { Plus, Trash } from "lucide-react"

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Plus /></Button>

// With Icon
<Button icon={Plus}>Add Item</Button>
```

### Card
Located at: `src/components/ui/Card.tsx`

```tsx
import Card from "@/components/ui/Card"

<Card className="p-6">
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content goes here.</p>
</Card>
```

### StatCard
Located at: `src/components/ui/StatCard.tsx`

Used for displaying metrics with an icon.

```tsx
import StatCard from "@/components/ui/StatCard"
import { DollarSign } from "lucide-react"

<StatCard
  title="Total Revenue"
  value="$50,000"
  subtitle="+12% from last month"
  icon={DollarSign}
  gradient="green" // Maps to semantic green styles
/>
```

## Layout Patterns

### Page Container
```tsx
<div className="space-y-8">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
      <p className="text-muted-foreground mt-2">Page description</p>
    </div>
    <Button>Action</Button>
  </div>

  {/* Content */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Cards */}
  </div>
</div>
```

### Data Display
Use `Card` components to group related data. Ensure text colors use `text-foreground` for primary content and `text-muted-foreground` for secondary content.

## Future Development
When creating new components or pages:
1.  **Always** use the semantic color variables.
2.  **Avoid** hardcoded hex values or arbitrary Tailwind colors (e.g., `bg-blue-500`) unless strictly necessary for a specific data visualization.
3.  **Ensure** all interactive elements have focus states (`focus-visible:ring-2`).
4.  **Test** in both light and dark modes.
