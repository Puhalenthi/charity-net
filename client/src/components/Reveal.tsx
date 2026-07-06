import * as React from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

type Variant = 'up' | 'scale' | 'blur' | 'left' | 'right';

const VARIANT_CLASS: Record<Variant, string> = {
  up: '',
  scale: 'reveal-scale',
  blur: 'reveal-blur',
  left: 'reveal-left',
  right: 'reveal-right',
};

type RevealProps<T extends React.ElementType> = {
  as?: T;
  variant?: Variant;
  /** Stagger delay in ms (applied as transition-delay). */
  delay?: number;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Wraps content in a scroll-reveal. Combine `variant` (direction/effect) with
 * `delay` to stagger siblings. Honors prefers-reduced-motion via CSS.
 */
export function Reveal<T extends React.ElementType = 'div'>({
  as,
  variant = 'up',
  delay = 0,
  className,
  children,
  ...rest
}: RevealProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof RevealProps<T>>) {
  const Comp = (as ?? 'div') as React.ElementType;
  const { ref, inView } = useInView();
  return (
    <Comp
      ref={ref}
      className={cn('reveal', VARIANT_CLASS[variant], inView && 'in-view', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Comp>
  );
}
