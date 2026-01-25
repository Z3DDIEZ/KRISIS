import { useState, useEffect, useRef, ReactNode } from 'react'

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
 * LazyLoad component using IntersectionObserver
 * Only renders children when the element enters the viewport
 */
function LazyLoad({
    children,
    placeholder,
    rootMargin = '100px',
    threshold = 0.1,
    className = '',
    'data-track-lazy': dataTrackLazy
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
                threshold
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
            className={className}
            data-track-lazy={dataTrackLazy}
            data-lazy-loaded={isVisible}
        >
            {isVisible ? children : placeholder || (
                <div className="animate-pulse bg-background-light rounded-lg" style={{ minHeight: '200px' }}>
                    <div className="flex items-center justify-center h-full p-xl text-secondary">
                        Loading...
                    </div>
                </div>
            )}
        </div>
    )
}

export default LazyLoad
