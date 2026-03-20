import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import TopNavbar from '../components/ui/TopNavbar'
import BackToTop from '../components/ui/BackToTop'
import Sidebar from '../components/ui/Sidebar'
import Icon from '../components/ui/Icon'
import ScrollToTop from '../components/utils/ScrollToTop'
import { SearchProvider } from '../context/SearchContext'

import PixelCanvas from '../components/effects/PixelCanvas'
import SplashCursor from '../components/effects/SplashCursor'

interface MainLayoutProps {
  children: React.ReactNode
}

type SidebarState = 'expanded' | 'collapsed'

/**
 * MainLayout - App shell with global navigation, sidebar, and content region.
 * @param props - Layout content to render within the shell.
 * @returns The primary application layout wrapper.
 */
function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const [sidebarState, setSidebarState] = useState<SidebarState>(() => {
    const savedState = localStorage.getItem('sidebar-state')
    return savedState === 'collapsed' || savedState === 'expanded'
      ? (savedState as SidebarState)
      : 'expanded'
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Adjust mobile sidebar state in render when path changes
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

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
    <SearchProvider>
      <ScrollToTop />
      <PixelCanvas speed={0.01} gap={10} className="opacity-15 dark:opacity-10" />
      <SplashCursor />
      <div className="h-screen bg-bg-subtle text-text-primary font-primary flex flex-col overflow-hidden transition-all duration-300">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 z-50 px-4 py-2 bg-brand-orange text-white rounded-none shadow-md font-bold"
        >
          Skip to main content
        </a>

        {/* Top Navigation */}
        <div className="shrink-0 z-30">
          <TopNavbar onToggleSidebar={toggleSidebar} />
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Sidebar */}
          <aside
            className={`
              fixed inset-y-0 left-0 z-40 w-64 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:w-auto
              ${mobileSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:shadow-none'}
              ${sidebarState === 'collapsed' ? 'lg:w-[72px]' : 'lg:w-64'}
              bg-bg-surface border-r border-border flex flex-col shrink-0
            `}
            aria-label="Main menu"
          >
            <div className="h-full flex flex-col">
              {/* Mobile Close Button */}
              <div className="lg:hidden flex justify-end p-4 border-b border-border mb-2">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 text-text-primary hover:bg-bg-subtle rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <Icon name="close" size={24} />
                </button>
              </div>

              <Sidebar
                primaryItems={primaryItems}
                secondaryItems={secondaryItems}
                isCollapsed={sidebarState === 'collapsed'}
                isOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </div>
          </aside>

          {/* Mobile Overlay */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Main Content Area */}
          <main
            id="main-content"
            role="main"
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-transparent scroll-smooth"
          >
            <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in pb-20">
              {children}
            </div>
            <BackToTop />
          </main>
        </div>
      </div>
    </SearchProvider>
  )
}

export default MainLayout
