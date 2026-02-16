/**
 * PageHeader — Consistent page title and description block.
 * Uses design-system tokens for typography and spacing.
 */

import React from 'react'

export interface PageHeaderProps {
  /** Main page title */
  title: string
  /** Optional short description or subtitle */
  description?: string
  /** Optional action (e.g. primary button) aligned right on desktop */
  action?: React.ReactNode
  /** Optional decorative gradient blob (default true) */
  withGradient?: boolean
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  withGradient = true,
  className = ''
}) => {
  return (
    <header className={`page-header relative ${className}`}>
      {withGradient && (
        <div
          className="absolute -top-6 -left-6 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="heading-xl text-text-primary">{title}</h1>
          {description && (
            <p className="text-text-secondary font-medium max-w-lg text-sm sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0 flex items-center">{action}</div>
        )}
      </div>
    </header>
  )
}

export default React.memo(PageHeader)
