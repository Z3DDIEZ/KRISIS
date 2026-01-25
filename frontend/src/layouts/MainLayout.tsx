import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import UserMenu from '../components/ui/UserMenu'
import DarkModeToggle from '../components/ui/DarkModeToggle'
import BackToTop from '../components/ui/BackToTop'
import Sidebar from '../components/ui/Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  // "expanded" or "collapsed"
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed'>('expanded')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Initialize sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-state')
    if (savedState === 'collapsed' || savedState === 'expanded') {
      setSidebarState(savedState)
    }
  }, [])

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

  const allItems = [...primaryItems, ...secondaryItems]

  // Breadcrumb logic (simple version)
  const getBreadcrumbs = () => {
    const path = location.pathname
    if (path === '/') return [{ label: 'Home', href: '/' }]

    // Split path into segments
    const segments = path.split('/').filter(Boolean)
    const crumbs = [{ label: 'Home', href: '/' }]

    let currentPath = ''
    segments.forEach(segment => {
      currentPath += `/${segment}`
      // Capitalize first letter
      const label = segment.charAt(0).toUpperCase() + segment.slice(1)
      crumbs.push({ label, href: currentPath })
    })

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="layout" data-sidebar-state={sidebarState} data-page={location.pathname}>

      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link" data-track-action="skip-to-content">
        Skip to main content
      </a>

      {/* Header (Breadcrumbs, Actions) */}
      <header className="layout__header" role="banner">
        {/* Mobile Sidebar Toggle */}
        <button
          className="lg:hidden mr-4 p-2 text-text-secondary hover:text-primary-orange transition-colors"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Breadcrumb Navigation */}
        <nav className="navbar__breadcrumb" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <li key={crumb.href}>
                  {isLast ? (
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.href} data-track-breadcrumb={crumb.label.toLowerCase()}>
                      {crumb.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Header Actions */}
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:block">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="input-field py-1.5 px-3 text-sm rounded-full w-48 focus:w-64 transition-all"
                aria-label="Search applications"
                data-track-action="search"
              />
            </div>
          </div>
          <DarkModeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className="layout__sidebar"
        data-mobile-open={mobileSidebarOpen}
        aria-label="Main menu"
      >
        <Sidebar
          items={allItems}
          primaryItems={primaryItems}
          secondaryItems={secondaryItems}
          isCollapsed={sidebarState === 'collapsed'}
          onToggle={toggleSidebar}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </aside>

      {/* Mobile Overlay */}
      <div
        className="layout__overlay"
        data-mobile-open={mobileSidebarOpen}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Main Content */}
      <main className="layout__main" id="main-content" role="main">
        {/* Dynamic page content */}
        {children}
        <BackToTop />
      </main>
    </div>
  )
}

export default MainLayout