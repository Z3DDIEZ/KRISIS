import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import TopNavbar from '../components/ui/TopNavbar'
import BackToTop from '../components/ui/BackToTop'
import Sidebar from '../components/ui/Sidebar'
import { SearchContext } from '../context/SearchContext'

interface MainLayoutProps {
  children: React.ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed'>('expanded')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const getLayoutPattern = () => {
    const path = location.pathname;
    if (path === '/settings' || path === '/profile') return 'anchored-nav';
    // Use power-sidebar for all application paths to ensure consistent grid structure
    if (path.startsWith('/applications')) return 'power-sidebar';
    return 'power-sidebar';
  }

  const layoutPattern = getLayoutPattern();

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-state')
    if (savedState === 'collapsed' || savedState === 'expanded') {
      setSidebarState(savedState)
    }
  }, [])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    const newState = sidebarState === 'expanded' ? 'collapsed' : 'expanded'
    setSidebarState(newState)
    localStorage.setItem('sidebar-state', newState)
  }

  const primaryItems = [
    { name: 'Dashboard', href: '/', iconName: 'dashboard' },
    { name: 'Applications', href: '/applications', iconName: 'work' },
    { name: 'Analytics', href: '/analytics', iconName: 'trending-up' },
  ]

  const secondaryItems = [
    { name: 'Profile', href: '/profile', iconName: 'person' },
    { name: 'Data', href: '/data', iconName: 'download' },
    { name: 'Settings', href: '/settings', iconName: 'settings' },
  ]

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div
        className={`layout layout--${layoutPattern}`}
        data-sidebar-state={sidebarState}
        data-page={location.pathname}
      >
        <a href="#main-content" className="skip-link" data-track-action="skip-to-content">
          Skip to main content
        </a>

        <TopNavbar
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search applications, companies..."
          onToggleSidebar={toggleSidebar}
        />

        <aside
          className={`layout__sidebar ${mobileSidebarOpen ? 'layout__sidebar--mobile-open' : ''}`}
          aria-label="Main menu"
        >
          <button
            className="layout__sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <Sidebar
            primaryItems={primaryItems}
            secondaryItems={secondaryItems}
            isCollapsed={sidebarState === 'collapsed'}
            isOpen={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </aside>

        <button
          className="layout__hamburger"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileSidebarOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div
          className={`layout__overlay ${mobileSidebarOpen ? 'layout__overlay--visible' : ''}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        <main className="layout__main" id="main-content" role="main">
          <div className="layout__inner">
            {children}
          </div>
          <BackToTop />
        </main>
      </div>
    </SearchContext.Provider>
  )
}

export default MainLayout