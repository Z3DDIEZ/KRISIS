import { cn } from '../../lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all duration-300 ease-out shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.03)]',
        hover &&
          'hover:border-primary-200 dark:hover:border-primary-900/50 hover:shadow-[0_4px_20px_rgba(249,115,22,0.08),0_0_0_1px_rgba(249,115,22,0.05)] hover:-translate-y-px',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
