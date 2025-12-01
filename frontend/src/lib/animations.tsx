import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import { motion, type Variants } from 'framer-motion';

/**
 * Hook for animating numbers from 0 to a target value
 * @param end - Target number to count to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param start - Starting number (default: 0)
 * @returns Current animated value
 */
export const useCountUp = (
  end: number,
  duration: number = 2000,
  start: number = 0
): number => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = start;
    const endValue = end;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, start]);

  return Math.round(count);
};

/**
 * Hook for scroll reveal animations
 * @param ref - React ref to the element
 * @param options - Options for the intersection observer
 * @returns Boolean indicating if element is in view
 */
export const useScrollReveal = (
  ref: React.RefObject<HTMLElement | null>,
  options?: {
    once?: boolean;
    amount?: number;
    margin?: string | number;
  }
) => {
  const viewOptions: Parameters<typeof useInView>[1] = {
    once: options?.once ?? true,
    amount: options?.amount ?? 0.3,
  };
  
  if (options?.margin !== undefined) {
    viewOptions.margin = options.margin as any;
  }
  
  const isInView = useInView(ref, viewOptions);

  return isInView;
};

/**
 * Framer Motion variants for fade up animation
 */
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

/**
 * Framer Motion variants for fade in animation
 */
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Framer Motion variants for scale animation
 */
export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * Framer Motion variants for staggered children animation
 */
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for staggered item animation
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * Component wrapper for scroll reveal animations
 */
export const ScrollReveal: React.FC<{
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
}> = ({ children, variants = fadeUpVariants, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useScrollReveal(ref as React.RefObject<HTMLElement | null>);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

