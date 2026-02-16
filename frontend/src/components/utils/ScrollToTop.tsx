import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      })
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    })
  }, [pathname])

  return null
}
