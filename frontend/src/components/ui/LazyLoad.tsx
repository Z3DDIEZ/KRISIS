import { useState, useEffect, useRef, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface LazyLoadProps {
  children: ReactNode
  /** Placeholder to show while content is not visible */
  placeholder?: ReactNode
  /** Root margin for IntersectionObserver (default: '100px') */
  rootMargin?: string
  /** Threshold for IntersectionObserver (default: 0.1) */
  threshold?: number
  /** CSS class for the container */
  className?: string
  /** Data attribute for analytics tracking */
  'data-track-lazy'?: string
}

/**
 * LazyLoad - Renders children only when they enter the viewport.
 * @param props - Lazy load configuration and optional placeholder content.
 * @returns The lazy load wrapper.
 */
function LazyLoad({
  children,
  placeholder,
  rootMargin = '100px',
  threshold = 0.1,
  className = '',
  'data-track-lazy': dataTrackLazy,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // Once visible, stop observing
            observer.disconnect()
          }
        })
      },
      {
        rootMargin,
        threshold,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [rootMargin, threshold])

  return (
    <div
      ref={containerRef}
      className={cn('transition-all duration-500', className)}
      data-track-lazy={dataTrackLazy}
      data-lazy-loaded={isVisible}
    >
      {isVisible ? (
        <div className="animate-fade-in">{children}</div>
      ) : (
        placeholder || (
          <div className="animate-pulse bg-bg-subtle rounded-3xl border border-border flex items-center justify-center p-12 min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
              <span className="text-xs font-semibold text-text-muted">Ingesting data...</span>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default LazyLoad
