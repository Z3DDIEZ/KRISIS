import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import UserMenu from '../components/ui/UserMenu'
import DarkModeToggle from '../components/ui/DarkModeToggle'
import Icon from '../components/ui/Icon'
import BackToTop from '../components/ui/BackToTop'
import Sidebar from '../components/ui/Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  // Handle ESC key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-background-light">
      {/* Sticky Navigation Bar with Blur Backdrop */}
      <nav className="sticky top-0 z-40 navbar header-gradient backdrop-blur-md bg-background-white/80 border-b border-border-light">
        <div className="nav-container">
          {/* Logo */}
          <div className="logo group">
            <div className="logo-icon hover-scale">
              <Icon name="dashboard" size={24} />
            </div>
            <div>
              <div className="font-bold group-hover:text-primary-orange transition-colors duration-300">
                KRISIS
              </div>
              <div className="text-xs text-secondary hidden sm:block">
                Job Application Intelligence
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-lg">
            {primaryItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link transition-all duration-300 hover:text-primary-orange flex items-center gap-1 ${
                  location.pathname === item.href ? 'active text-primary-orange' : ''
                }`}
              >
                <Icon name={item.iconName} size={18} />
                <span className="hidden xl:inline">{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-sm">
            <DarkModeToggle />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="flex relative">
        {/* New Modern Sidebar */}
        <div className={`sidebar-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <Sidebar
            items={allItems}
            primaryItems={primaryItems}
            secondaryItems={secondaryItems}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content with Page Transitions */}
        <main 
          className="main-content flex-1 min-h-screen transition-all duration-300 w-full" 
          style={{ 
            marginTop: '4rem',
            marginLeft: '240px'
          }}
        >
          <div className="p-md md:p-lg lg:p-xl w-full">
            <div className="w-full max-w-7xl mx-auto">
              {/* Enhanced Mobile Header */}
              <div className="lg:hidden mb-lg">
                <div className="flex items-center justify-between p-md bg-background-white/80 backdrop-blur-md rounded-xl border border-border-light shadow-lg">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="btn btn-ghost btn-ripple"
                    aria-label="Open menu"
                    aria-expanded={sidebarOpen}
                  >
                    <Icon name="settings" size={20} />
                    <span className="ml-2">Menu</span>
                  </button>

                  {/* Mobile breadcrumb or current page */}
                  <div className="text-sm text-secondary">
                    {allItems.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                  </div>
                </div>
              </div>

              {/* Page Content with Transition */}
              <div className="page-transition">
                {children}
              </div>
            </div>
          </div>

          {/* Back to Top Button */}
          <BackToTop />
        </main>
      </div>
    </div>
  )
}

export default MainLayout