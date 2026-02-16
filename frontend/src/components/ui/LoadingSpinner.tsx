interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  [key: string]: unknown
}

function LoadingSpinner({ size = 'md', className = '', ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div
      className={`animate-spin rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-primary-600 dark:border-t-primary-500 ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}

export default LoadingSpinner
