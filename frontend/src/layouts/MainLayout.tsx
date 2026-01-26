import { useState, useEffect, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import TopNavbar from '../components/ui/TopNavbar'
import BackToTop from '../components/ui/BackToTop'
import Sidebar from '../components/ui/Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

// Search context for global search functionality
interface SearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const SearchContext = createContext<SearchContextType>({
  searchQuery: '',
  setSearchQuery: () => { }
})

export const useSearch = () => useContext(SearchContext)

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed'>('expanded')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-state')
    if (savedState === 'collapsed' || savedState === 'expanded') {
      setSidebarState(savedState)
    }
  }, [])

  // Close mobile sidebar on route change
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
        className="layout layout--dual-nav"
        data-sidebar-state={sidebarState}
        data-page={location.pathname}
      >
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="skip-link" data-track-action="skip-to-content">
          Skip to main content
        </a>

        {/* Top Navigation Bar (Global) */}
        <TopNavbar
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search applications, companies..."
        />

        {/* Sidebar (Section-specific) */}
        <aside
          className={`layout__sidebar ${mobileSidebarOpen ? 'layout__sidebar--mobile-open' : ''}`}
          aria-label="Main menu"
        >
          {/* Mobile Close Button */}
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
            onToggle={toggleSidebar}
            isOpen={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </aside>

        {/* Mobile Hamburger Button (Fixed Position) */}
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

        {/* Mobile Overlay */}
        <div
          className={`layout__overlay ${mobileSidebarOpen ? 'layout__overlay--visible' : ''}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Main Content */}
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