interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  [key: string]: unknown
}

/**
 * LoadingSpinner - Animated spinner for loading states.
 * @param props - Size and optional className overrides.
 * @returns The spinner element.
 */
function LoadingSpinner({ size = 'md', className = '', ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div
      className={`animate-spin rounded-full border-2 border-border border-t-primary-600 ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}

export default LoadingSpinner
