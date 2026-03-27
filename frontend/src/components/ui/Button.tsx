import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

/**
 * Button - Primary and secondary action control.
 * @param props - Button attributes, plus optional size and variant.
 * @returns A styled button element with consistent interaction states.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',

          // Variants
          variant === 'primary' &&
            'bg-primary-600 text-white shadow-sm hover:bg-primary-500 hover:shadow-md',
          variant === 'secondary' &&
            'bg-bg-surface text-text-primary border border-border hover:border-border-strong hover:bg-bg-subtle',
          variant === 'ghost' &&
            'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-subtle',
          variant === 'danger' &&
            'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50',

          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          size === 'icon' && 'p-2 aspect-square',

          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
