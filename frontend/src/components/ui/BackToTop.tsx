import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import Icon from './Icon'

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-10 right-10 z-50 p-4 rounded-full transition-all duration-500 pointer-events-auto',
        'bg-primary-600 dark:bg-primary-500 text-white shadow-2xl shadow-primary-500/50',
        'hover:bg-primary-700 dark:hover:bg-primary-600 hover:-translate-y-2 active:scale-95',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      )}
      aria-label="Back to top"
    >
      <Icon name="arrow-up" size={20} className="text-white" />
    </button>
  )
}

export default BackToTop
