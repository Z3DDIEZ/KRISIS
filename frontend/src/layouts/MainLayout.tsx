import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import UserMenu from '../components/ui/UserMenu'
import DarkModeToggle from '../components/ui/DarkModeToggle'
import Icon from '../components/ui/Icon'
import BackToTop from '../components/ui/BackToTop'

interface MainLayoutProps {
  children: React.ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', iconName: 'dashboard', description: 'Overview & Stats' },
    { name: 'Applications', href: '/applications', iconName: 'work', description: 'Manage Applications' },
    { name: 'Analytics', href: '/analytics', iconName: 'trending-up', description: 'Insights & Charts' },
    { name: 'Profile', href: '/profile', iconName: 'person', description: 'Account Settings' },
    { name: 'Data', href: '/data', iconName: 'download', description: 'Import & Export' },
    { name: 'Settings', href: '/settings', iconName: 'settings', description: 'Preferences' },
  ]

  // Close sidebar on mobile when clicking a link
  const handleNavClick = () => {
    setSidebarOpen(false)
  }

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
            {navigation.slice(0, 4).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
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
        {/* Enhanced Sidebar Navigation */}
        <nav className={`fixed inset-y-0 left-0 z-50 bg-background-white/95 backdrop-blur-xl shadow-2xl border-r border-border-light transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-24' : 'w-72'}`}
        style={{ top: '4rem' }}>
          <div className="flex flex-col h-full lg:h-auto" style={{ height: 'calc(100vh - 4rem)' }}>
            {/* Sidebar Header */}
            <div className="p-lg border-b border-border-light header-gradient flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-sm group">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-orange to-primary-orange-light rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon name="dashboard" size={20} />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-primary group-hover:text-primary-orange transition-colors duration-300">
                      KRISIS
                    </span>
                    <p className="text-secondary text-xs">Job Intelligence</p>
                  </div>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="w-12 h-12 bg-gradient-to-br from-primary-orange to-primary-orange-light rounded-xl flex items-center justify-center shadow-lg mx-auto">
                  <Icon name="dashboard" size={24} />
                </div>
              )}
              {/* Collapse Toggle - Desktop Only */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background-light transition-colors duration-200 text-secondary hover:text-primary ml-auto"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <Icon name="arrow-right" size={16} />
                ) : (
                  <Icon name="arrow-left" size={16} />
                )}
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 p-lg overflow-y-auto overflow-x-hidden">
              <ul className="space-y-2">
                {navigation.map((item, index) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={handleNavClick}
                      className={`nav-link group block rounded-lg transition-all duration-300 hover-lift ${
                        location.pathname === item.href ? 'active bg-primary-orange/10 border-l-4 border-primary-orange' : 'hover:bg-background-light'
                      } ${sidebarCollapsed ? 'p-2 justify-center' : 'p-md'}`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-md'}`}>
                        <div className={`rounded-lg transition-all duration-300 flex-shrink-0 ${
                          location.pathname === item.href
                            ? 'bg-primary-orange text-white shadow-lg'
                            : 'bg-background-light text-secondary group-hover:bg-primary-orange/10 group-hover:text-primary-orange'
                        } ${sidebarCollapsed ? 'p-2' : 'p-2'}`}>
                          <Icon name={item.iconName} size={20} />
                        </div>
                        {!sidebarCollapsed && (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-primary group-hover:text-primary-orange transition-colors duration-300">
                                {item.name}
                              </div>
                              <div className="text-xs text-secondary opacity-70 truncate">
                                {item.description}
                              </div>
                            </div>
                            {location.pathname === item.href && (
                              <div className="w-2 h-2 bg-primary-orange rounded-full animate-pulse-glow flex-shrink-0" />
                            )}
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sidebar Footer */}
            <div className="p-lg border-t border-border-light bg-background-light/50">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Version 1.0.0</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Enhanced Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in-scale"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content with Page Transitions */}
        <main className="flex-1 min-h-screen transition-all duration-300 w-full" style={{ marginTop: '4rem' }}>
          <div className="p-md md:p-lg lg:p-xl w-full">
            <div className="w-full max-w-7xl mx-auto">
              {/* Enhanced Mobile Header */}
              <div className="lg:hidden mb-lg">
                <div className="flex items-center justify-between p-md bg-background-white/80 backdrop-blur-md rounded-xl border border-border-light shadow-lg">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="btn btn-ghost btn-ripple"
                    aria-label="Open menu"
                  >
                    <Icon name="settings" size={20} />
                    <span className="ml-2">Menu</span>
                  </button>

                  {/* Mobile breadcrumb or current page */}
                  <div className="text-sm text-secondary">
                    {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
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