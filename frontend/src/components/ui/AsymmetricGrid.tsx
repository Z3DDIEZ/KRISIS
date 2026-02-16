import React from 'react'
import { cn } from '../../lib/utils'

type CardSize = 'small' | 'medium' | 'large' | 'full'

interface AsymmetricGridProps {
  children: React.ReactNode
  pattern?: 'featured' | 'analytics' | 'mixed'
  className?: string
}

export const AsymmetricGrid: React.FC<AsymmetricGridProps> = ({
  children,
  pattern = 'mixed',
  className = '',
}) => {
  const getPatternStyles = () => {
    switch (pattern) {
      case 'featured':
        return 'grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8'
      case 'analytics':
        return 'grid grid-cols-1 md:grid-cols-12 gap-6'
      case 'mixed':
      default:
        return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'
    }
  }

  return <div className={cn(getPatternStyles(), className)}>{children}</div>
}

interface AsymmetricCardProps {
  children: React.ReactNode
  size?: CardSize
  className?: string
}

export const AsymmetricCard: React.FC<AsymmetricCardProps> = ({
  children,
  size = 'medium',
  className = '',
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'md:col-span-1'
      case 'medium':
        return 'md:col-span-2'
      case 'large':
        return 'md:col-span-3'
      case 'full':
        return 'md:col-span-1 md:col-span-3 lg:col-span-4'
      default:
        return ''
    }
  }

  return <div className={cn(getSizeStyles(), className)}>{children}</div>
}
