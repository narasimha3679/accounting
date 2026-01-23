import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { type LucideIcon, Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-neon-emerald text-deep-forest hover:bg-neon-emerald/90 glow-emerald",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "glass border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
        secondary:
          "glass text-white hover:bg-white/10",
        ghost: "hover:bg-white/10 text-white",
        link: "text-neon-emerald underline-offset-4 hover:underline",
        cta: "bg-gradient-to-r from-neon-emerald to-golden-hour text-deep-forest hover:opacity-90 glow-emerald font-bold",
        // Legacy support mapping
        primary: "bg-neon-emerald text-deep-forest hover:bg-neon-emerald/90 glow-emerald",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  isLoading?: boolean
  // Legacy props to ignore or map
  gradientFrom?: string
  gradientTo?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, icon: Icon, iconPosition = 'left', isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Map legacy variants
    let finalVariant = variant;
    if (variant === 'primary' as any) finalVariant = 'default';
    if (variant === 'danger' as any) finalVariant = 'destructive';

    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && Icon && iconPosition === 'left' && <Icon className="mr-2 h-4 w-4" />}
        {children}
        {!isLoading && Icon && iconPosition === 'right' && <Icon className="ml-2 h-4 w-4" />}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button
