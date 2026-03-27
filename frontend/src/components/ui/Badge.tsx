import { cn } from '../../lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'neutral'
    | 'information'
    | 'success'
    | 'warning'
    | 'error'
    | 'applied'
    | 'phone-screen'
    | 'technical'
    | 'final'
    | 'offer'
    | 'rejected'
  children: React.ReactNode
}

/**
 * Badge - Compact status label for categories and metadata.
 * @param props - Badge text and optional visual variant.
 * @returns A styled badge element with semantic colours.
 */
export function Badge({ children, className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border',

        // Status Variants (matching index.css)
        variant === 'applied' &&
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        variant === 'phone-screen' &&
          'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',
        variant === 'technical' &&
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
        variant === 'final' &&
          'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
        variant === 'offer' &&
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
        variant === 'rejected' && 'bg-bg-subtle text-text-muted border-border',

        // Generic Variants
        variant === 'neutral' && 'bg-bg-subtle text-text-muted border-border',
        variant === 'information' &&
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800',
        variant === 'success' &&
          'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        variant === 'warning' &&
          'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
        variant === 'error' &&
          'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',

        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
