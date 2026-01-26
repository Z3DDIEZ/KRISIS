import { useState, useEffect } from 'react'
import Icon from './Icon'


function DarkModeToggle() {
  // Initialize with saved theme or system preference to prevent flash
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return savedTheme === 'dark' || (!savedTheme && prefersDark)
    }
    return false
  })

  // Apply theme immediately on mount to prevent flash
  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

    setIsDark(shouldBeDark)
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
      className="bezel-icon btn-icon hover:shadow-lg transition-all"
      aria-label={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
      title={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
    >
      <Icon name={isDark ? 'lightbulb' : 'bolt'} size={20} className={isDark ? 'text-yellow-500' : 'text-primary-500'} />
    </button>
  )
}

export default DarkModeToggle