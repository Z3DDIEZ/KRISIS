import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from './Icon'

interface SidebarItem {
  name: string
  href: string
  iconName: string
  description?: string
}

interface SidebarProps {
  items?: SidebarItem[]
  primaryItems: SidebarItem[]
  secondaryItems: SidebarItem[]
  isOpen?: boolean
  onClose?: () => void
  isCollapsed: boolean
}

function Sidebar({ primaryItems, secondaryItems, isOpen, onClose, isCollapsed }: SidebarProps) {
  const location = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const sidebarRef = useRef<HTMLDivElement>(null)

  const handleItemHover = (itemName: string, event: React.MouseEvent) => {
    if (isCollapsed) {
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: rect.right + 8,
        y: rect.top + rect.height / 2
      })
      setHoveredItem(itemName)
    }
  }

  const handleItemLeave = () => {
    setHoveredItem(null)
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  // Handle click outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isOpen && onClose) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <>
      <nav
        ref={sidebarRef}
        className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isOpen ? 'sidebar-mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="sidebar__header px-6 flex items-center justify-between">
          {!isCollapsed && (
            <div className="sidebar__logo flex items-center gap-3">
              <div className="sidebar__logo-icon bg-surface-contrast text-text-on-contrast w-10 h-10 rounded flex items-center justify-center shadow-lg">
                <Icon name="work" size={20} />
              </div>
              <span className="sidebar__logo-text font-black text-primary tracking-tighter text-xl">KRISIS</span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center w-full">
              <div className="sidebar__logo-icon bg-surface-contrast text-text-on-contrast w-10 h-10 rounded flex items-center justify-center shadow-lg">
                <Icon name="work" size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="sidebar__section">
          <ul className="sidebar__list space-y-1">
            {primaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`sidebar__item ${isActive(item.href) ? 'sidebar__item--active' : ''}`}
                  onMouseEnter={(e) => handleItemHover(item.name, e)}
                  onMouseLeave={handleItemLeave}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <div className="sidebar__item-icon">
                    <Icon name={item.iconName} size={18} />
                  </div>
                  {!isCollapsed && (
                    <span className="sidebar__item-label">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Secondary Navigation */}
        <div className="sidebar__section sidebar__section--secondary">
          <ul className="sidebar__list space-y-1">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`sidebar__item ${isActive(item.href) ? 'sidebar__item--active' : ''}`}
                  onMouseEnter={(e) => handleItemHover(item.name, e)}
                  onMouseLeave={handleItemLeave}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <div className="sidebar__item-icon">
                    <Icon name={item.iconName} size={18} />
                  </div>
                  {!isCollapsed && (
                    <span className="sidebar__item-label">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar Footer / Logout */}
        <div className="sidebar__footer mt-auto border-t border-border-light pt-sm">
          <button
            onClick={async () => {
              try {
                const { auth } = await import('../../lib/firebase')
                const { signOut } = await import('firebase/auth')
                const { toast } = await import('sonner')
                await signOut(auth)
                toast.success('Signed out successfully')
                window.location.href = '/auth'
              } catch (error) {
                console.error('Logout error:', error)
              }
            }}
            className="sidebar__item sidebar__item--danger w-full text-left"
            onMouseEnter={(e) => handleItemHover('Sign Out', e)}
            onMouseLeave={handleItemLeave}
            data-track-nav="logout"
          >
            <div className="sidebar__item-icon text-red-500">
              <Icon name="logout" size={20} />
            </div>
            {!isCollapsed && (
              <span className="sidebar__item-label text-red-500 font-bold">Sign Out</span>
            )}
          </button>
        </div>

        {/* Tooltip for collapsed state */}
        {isCollapsed && hoveredItem && (
          <div
            className="sidebar-tooltip"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-50%)'
            }}
          >
            {hoveredItem}
            <div className="sidebar-tooltip-arrow" />
          </div>
        )}
      </nav>
    </>
  )
}

export default Sidebar