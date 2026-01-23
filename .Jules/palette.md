## 2026-01-23 - Standardizing Loading States
**Learning:** UX consistency suffers when loading states are implemented manually in each component. Centralizing loading logic (spinner, disabled state) in the base `Button` component not only reduces code duplication but ensures consistent feedback across the app.
**Action:** Always check base UI components for missing "standard" states like loading or error before implementing them manually in page components.
