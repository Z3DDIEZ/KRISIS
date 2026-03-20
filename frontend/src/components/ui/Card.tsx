import { cn } from '../../lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

/**
 * Card - Surface wrapper for grouped content and panels.
 * @param props - Standard div attributes, plus `hover` for elevation.
 * @returns A styled card container for consistent layout.
 */
export function Card({ children, className, hover = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'surface-card relative text-text-primary transition-all duration-300 ease-out',
        hover &&
          'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
      {...props}
    >
      {/* Bauhaus Accent Notch */}
      <div className="absolute top-0 right-0 w-8 h-8 border-r border-t border-primary-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </div>
  )
}
