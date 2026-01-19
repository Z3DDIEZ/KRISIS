import { useState, useEffect } from 'react'


function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  // Ensure dark mode is set on the entire <html> element when toggling or on initial load
  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      root.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      setIsDark(false)
      root.setAttribute('data-theme', 'light')
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const newTheme = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    root.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    root.classList.toggle('dark', newTheme === 'dark')
    root.classList.toggle('light', newTheme === 'light')
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-icon"
      aria-label={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
      title={isDark ? 'Toggle light mode' : 'Toggle dark mode'}
    >
      {isDark ? (
        // Sun icon for light mode
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

export default DarkModeToggle