import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',

          // Variants
          variant === 'primary' &&
            'bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 hover:shadow-primary-500/30',
          variant === 'secondary' &&
            'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
          variant === 'ghost' &&
            'bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800',
          variant === 'danger' &&
            'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40',

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
