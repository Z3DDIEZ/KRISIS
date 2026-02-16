import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import Icon from './Icon'

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return savedTheme === 'dark' || (!savedTheme && prefersDark)
    }
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    root.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const newTheme = isDark ? 'light' : 'dark'
    const newIsDark = !isDark

    setIsDark(newIsDark)
    root.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative p-2.5 rounded-xl transition-all duration-300 group overflow-hidden',
        'bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80',
        'border border-zinc-200 dark:border-zinc-700/50',
        'shadow-sm hover:shadow-md active:scale-95'
      )}
      aria-label={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
      title={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
    >
      <div className="relative z-10 flex items-center justify-center">
        <Icon
          name={isDark ? 'lightbulb' : 'bolt'}
          size={18}
          className={cn(
            'transition-all duration-500',
            isDark ? 'text-yellow-400 rotate-12 scale-110' : 'text-primary-600'
          )}
        />
      </div>
      <div className="absolute inset-0 bg-linear-to-tr from-primary-500/0 via-primary-500/0 to-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

export default DarkModeToggle
