# Cashual Design System

A comprehensive design system document for the Cashual FinTech Luxury theme. Use this as a reference for building consistent pages across the Cashual platform and personal finance projects.

## Design Philosophy

**FinTech Luxury** - A sophisticated, dark-mode design language that balances data-heavy interfaces with aesthetic elegance. The design emphasizes clarity, trust, and premium feel through glassmorphism, subtle animations, and a carefully curated color palette.

---

## Color Palette

### Primary Colors

```css
/* Deep Forest - Primary Background */
--deep-forest: #020402
/* Rich, almost-black green that provides depth and sophistication */

/* Charcoal - Secondary Background */
--charcoal: #1a1a1a
/* Used for cards, elevated surfaces, and depth layers */
```

### Accent Colors

```css
/* Neon Emerald - Growth, Positive Actions, Primary CTAs */
--neon-emerald: #34d399
/* Use for: Growth indicators, positive metrics, primary buttons, success states */

/* Golden Hour - Wealth, Assets, Premium Features */
--golden-hour: #fbbf24
/* Use for: Asset values, wealth indicators, premium highlights, secondary CTAs */
```

### Text Colors

```css
/* Primary Text */
--white: #ffffff
/* Headlines, important labels, primary content */

/* Muted Text */
--slate-muted: #94a3b8
/* Body text, secondary information, descriptions */

/* Accent Text */
/* Use neon-emerald or golden-hour for emphasis */
```

### Usage Guidelines

- **Backgrounds**: Always use deep-forest as base. Layer charcoal for elevated surfaces.
- **Accents**: Neon Emerald for growth/positive actions. Golden Hour for wealth/assets.
- **Text**: White for primary, slate-muted for secondary. Never use pure black text.
- **Contrast**: Ensure WCAG AA compliance (4.5:1 ratio minimum).

---

## Typography

### Font Families

```css
/* Primary Font - Body & Headlines */
font-family: 'Inter', system-ui, sans-serif;
/* Modern, clean sans-serif. Excellent readability at all sizes. */

/* Monospace Font - Numbers & Financial Data */
font-family: 'JetBrains Mono', monospace;
/* Tabular numbers for financial data. Ensures alignment in tables/graphs. */
```

### Type Scale

```css
/* Headlines */
text-8xl: 6rem (96px)    /* Hero headlines */
text-7xl: 4.5rem (72px)  /* Large hero */
text-5xl: 3rem (48px)    /* Section headlines */
text-4xl: 2.25rem (36px) /* Subsection headlines */
text-3xl: 1.875rem (30px) /* Card headlines */
text-2xl: 1.5rem (24px)  /* Large body emphasis */
text-xl: 1.25rem (20px)  /* Card titles */

/* Body */
text-lg: 1.125rem (18px) /* Large body text */
text-base: 1rem (16px)   /* Default body text */
text-sm: 0.875rem (14px) /* Small body, captions */
text-xs: 0.75rem (12px)  /* Tiny labels, metadata */
```

### Typography Rules

1. **Numbers**: Always use `tabular-nums` class with JetBrains Mono for financial data
2. **Headlines**: Use Inter with weights 700-900 for impact
3. **Body**: Use Inter weight 400-500 for readability
4. **Line Height**: 1.5 for body, 1.2 for headlines
5. **Letter Spacing**: Default for body, slightly tighter (-0.02em) for large headlines

---

## Glassmorphism

### Core Glass Effect

```css
.glass {
  background: rgba(26, 26, 26, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem; /* 16px */
}
```

### Variations

```css
/* Light Glass (more transparent) */
.glass-light {
  background: rgba(26, 26, 26, 0.2);
  backdrop-filter: blur(10px);
}

/* Heavy Glass (more opaque) */
.glass-heavy {
  background: rgba(26, 26, 26, 0.6);
  backdrop-filter: blur(30px);
}

/* Colored Glass (with accent tint) */
.glass-emerald {
  background: rgba(52, 211, 153, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(52, 211, 153, 0.2);
}

.glass-golden {
  background: rgba(251, 191, 36, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(251, 191, 36, 0.2);
}
```

### Usage

- **Cards**: Use glass effect for all card components
- **Navigation**: Sticky nav with glass effect
- **Modals/Overlays**: Heavy glass for depth
- **Hover States**: Slightly increase opacity on hover

---

## Spacing & Layout

### Spacing Scale

```css
/* Tailwind spacing scale */
0: 0px
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px)
6: 1.5rem (24px)
8: 2rem (32px)
12: 3rem (48px)
16: 4rem (64px)
24: 6rem (96px)
32: 8rem (128px)
```

### Container Widths

```css
/* Max container width */
max-w-7xl: 80rem (1280px) /* Main content */
max-w-4xl: 56rem (896px)  /* Narrow content */
max-w-2xl: 42rem (672px)  /* Text content */
```

### Grid System

- **Mobile First**: Design for mobile, enhance for desktop
- **Breakpoints**: 
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
- **Columns**: Use CSS Grid or Tailwind grid (grid-cols-1 to grid-cols-12)

---

## Component Styles

### Buttons

#### Primary Button (Neon Emerald)

```tsx
<Button variant="default">
  Primary Action
</Button>
```

#### Secondary Button (Glass)

```tsx
<Button variant="secondary">
  Secondary Action
</Button>
```

#### CTA Button (Gradient)

```tsx
<Button variant="cta">
  Call to Action
</Button>
```

### Cards

```tsx
<Card className="p-6">
  <h3 className="text-lg font-semibold text-white">Card Title</h3>
  <p className="text-slate-muted">Card content goes here.</p>
</Card>
```

### Borders

```css
/* Standard Border */
border: 1px solid rgba(255, 255, 255, 0.1)

/* Accent Border */
border: 1px solid rgba(52, 211, 153, 0.3) /* neon-emerald */
border: 1px solid rgba(251, 191, 36, 0.3) /* golden-hour */

/* Subtle Border */
border: 1px solid rgba(255, 255, 255, 0.05)
```

---

## Visual Effects

### Glow Effects

```css
/* Emerald Glow */
.glow-emerald {
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.3);
}

/* Golden Glow */
.glow-golden {
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
}
```

### Shadows

```css
/* Subtle Shadow */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

/* Medium Shadow */
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);

/* Glow Shadow */
box-shadow: 0 0 30px rgba(52, 211, 153, 0.4);
```

### Gradients

```css
/* Text Gradient */
bg-gradient-to-r from-neon-emerald to-golden-hour
bg-clip-text
text-transparent

/* Background Gradient */
bg-gradient-to-br from-black/60 to-black/40

/* Accent Gradient */
bg-gradient-to-r from-neon-emerald/20 to-transparent
```

---

## Animation Patterns

### Scroll Reveals

```tsx
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/lib/animations';

const ref = useRef(null);
const isInView = useScrollReveal(ref);

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 30 }}
  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
  transition={{ duration: 0.8 }}
>
  Content
</motion.div>
```

### Staggered Animations

```tsx
import { staggerContainer, staggerItem } from '@/lib/animations';

<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map((item, idx) => (
    <motion.div key={idx} variants={staggerItem}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### Number Counting

```tsx
import { useCountUp } from '@/lib/animations';

const count = useCountUp(12500, 2000);
<span className="tabular-nums">${count}</span>
```

### Hover Effects

```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Hover me
</motion.div>
```

---

## Iconography

### Icon Library

- **Lucide React** - Primary icon library
- **Size Scale**: 16px (sm), 20px (base), 24px (md), 32px (lg), 48px (xl)

### Icon Usage

```tsx
// Standard Icon
<Icon className="w-5 h-5 text-neon-emerald" />

// With Text
<div className="flex items-center gap-2">
  <Icon className="w-5 h-5" />
  <span>Label</span>
</div>

// Colored Icons
<Icon className="w-6 h-6 text-neon-emerald" />  // Growth/Positive
<Icon className="w-6 h-6 text-golden-hour" />   // Wealth/Assets
<Icon className="w-6 h-6 text-slate-muted" />    // Neutral
```

---

## Data Visualization

### Charts & Graphs

#### Line Graphs

- **Stroke Color**: `#34d399` (neon-emerald)
- **Fill Gradient**: From neon-emerald (opacity 0.8) to transparent
- **Animation**: Path length animation from 0 to 1
- **Duration**: 1.5-2 seconds

#### Bar Charts

- **Positive Bars**: neon-emerald gradient
- **Negative Bars**: red-400 with opacity
- **Background**: black/40 with border

#### Pie Charts

- **Colors**: neon-emerald, golden-hour, blue-400, purple-400
- **Stroke**: white/10 border

### Financial Data Display

```css
/* Always use tabular-nums for numbers */
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', monospace;
}

/* Currency Format */
$12,345.67  /* Always include commas, 2 decimal places for currency */
```

---

## Responsive Design

### Mobile First Approach

1. **Base Styles**: Mobile (320px+)
2. **Tablet**: `md:` breakpoint (768px+)
3. **Desktop**: `lg:` breakpoint (1024px+)
4. **Large Desktop**: `xl:` breakpoint (1280px+)

### Common Patterns

```css
/* Responsive Text */
text-3xl md:text-4xl lg:text-5xl

/* Responsive Padding */
p-4 md:p-6 lg:p-8

/* Responsive Grid */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Responsive Spacing */
gap-4 md:gap-6 lg:gap-8
```

---

## Accessibility

### Color Contrast

- **Text on Background**: Minimum 4.5:1 ratio (WCAG AA)
- **Large Text**: Minimum 3:1 ratio
- **Interactive Elements**: Clear focus states

### Focus States

```css
/* Focus Ring */
focus:outline-none
focus:ring-2
focus:ring-neon-emerald
focus:ring-offset-2
focus:ring-offset-deep-forest
```

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Include ARIA labels for icons
- Provide alt text for images
- Use semantic elements (nav, section, article, etc.)

---

## Component Examples

### Metric Card

```tsx
<StatCard
  title="Total Revenue"
  value="$12,345"
  subtitle="+8.2% from last month"
  icon={DollarSign}
  accent="emerald"
/>
```

### Feature Card

```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  className="glass rounded-2xl p-8"
>
  <Icon className="w-12 h-12 text-neon-emerald mb-4" />
  <h3 className="text-2xl font-bold text-white mb-2">Title</h3>
  <p className="text-slate-muted">Description</p>
</motion.div>
```

---

## Quick Reference

### Color Classes (Tailwind)

- `bg-deep-forest` / `text-deep-forest`
- `bg-neon-emerald` / `text-neon-emerald`
- `bg-golden-hour` / `text-golden-hour`
- `bg-charcoal` / `text-charcoal`
- `text-slate-muted`

### Utility Classes

- `.glass` - Glassmorphism effect
- `.glass-light` - Light glass effect
- `.glass-heavy` - Heavy glass effect
- `.glass-emerald` - Emerald tinted glass
- `.glass-golden` - Golden tinted glass
- `.glow-emerald` - Emerald glow shadow
- `.glow-golden` - Golden glow shadow
- `.tabular-nums` - Monospace numbers

### Animation Classes

- `animate-glow-pulse` - Pulsing glow effect
- `animate-float` - Floating animation

---

## Design Principles

1. **Dark First**: Always design for dark mode. This is the primary experience.
2. **Data Clarity**: Financial data must be clear, readable, and properly formatted.
3. **Subtle Motion**: Animations should enhance, not distract. Keep them smooth and purposeful.
4. **Depth Through Layers**: Use glassmorphism and shadows to create visual hierarchy.
5. **Premium Feel**: Every element should feel polished and intentional.
6. **Trust Building**: Security badges, certifications, and professional presentation build trust.
7. **Responsive Excellence**: Mobile experience should be as polished as desktop.

---

## Implementation Notes

- **Framer Motion**: Use for all complex animations
- **Tailwind CSS**: Primary styling framework
- **CSS Variables**: Defined in `index.css` for theme consistency
- **Custom Hooks**: Create reusable animation hooks (e.g., `useCountUp`)
- **Performance**: Use `transform` and `opacity` for animations (GPU accelerated)

---

## Future Extensions

When building new pages:

1. Reference this design system for consistency
2. Maintain the color palette and typography
3. Use the same animation patterns
4. Follow the component style guidelines
5. Ensure responsive design at all breakpoints
6. Test accessibility (contrast, keyboard navigation)

---

**Last Updated**: 2024

**Version**: 1.0

**Maintained By**: Cashual Design Team
