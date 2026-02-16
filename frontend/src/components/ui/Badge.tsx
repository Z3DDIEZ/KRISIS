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

export function Badge({ children, className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',

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
        variant === 'rejected' &&
          'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700',

        // Generic Variants
        variant === 'neutral' &&
          'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
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
