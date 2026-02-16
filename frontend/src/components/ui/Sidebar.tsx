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
        x: rect.right + 12, // More spacing
        y: rect.top + rect.height / 2,
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
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isOpen &&
        onClose
      ) {
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
    <nav
      ref={sidebarRef}
      className="flex-1 overflow-y-auto py-4 flex flex-col gap-6"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Sidebar Header/Logo - Visible only on mobile/expanded desktop */}
      <div className={`px-6 flex items-center ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3 text-primary-600 dark:text-primary-500">
          <Icon name="work" size={24} className="shrink-0" />
          {!isCollapsed && (
            <span className="font-black text-xl tracking-tighter text-zinc-900 dark:text-white">
              KRISIS
            </span>
          )}
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="px-3">
        <ul className="space-y-1">
          {primaryItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={onClose}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 transform
                  ${
                    isActive(item.href)
                      ? 'bg-primary-50 dark:bg-orange-500/5 text-primary-700 dark:text-primary-400 font-black shadow-[0_0_15px_rgba(234,88,12,0.1)] ring-1 ring-primary-200/50 dark:ring-primary-500/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 hover:translate-x-1'
                  }
                  ${isCollapsed ? 'justify-center px-2 hover:translate-x-0' : ''}
                `}
                onMouseEnter={(e) => handleItemHover(item.name, e)}
                onMouseLeave={handleItemLeave}
                aria-current={isActive(item.href) ? 'page' : undefined}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={`shrink-0 ${isActive(item.href) ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}
                >
                  <Icon name={item.iconName} size={20} />
                </div>
                {!isCollapsed && (
                  <span className="truncate font-black text-[11px] uppercase tracking-wider">
                    {item.name}
                  </span>
                )}
                {isActive(item.href) && !isCollapsed && (
                  <div className="absolute left-0 w-1 h-5 bg-primary-600 rounded-r-full shadow-[0_0_8px_rgba(234,88,12,0.4)]" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Secondary Navigation */}
      <div className="px-3 mt-auto">
        <div
          className={`text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-3 ${isCollapsed ? 'hidden' : 'block'}`}
        >
          Workspace
        </div>
        <ul className="space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {secondaryItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={onClose}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 transform
                  ${
                    isActive(item.href)
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 hover:translate-x-1'
                  }
                  ${isCollapsed ? 'justify-center px-2 hover:translate-x-0' : ''}
                `}
                onMouseEnter={(e) => handleItemHover(item.name, e)}
                onMouseLeave={handleItemLeave}
                aria-current={isActive(item.href) ? 'page' : undefined}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={`shrink-0 ${isActive(item.href) ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}
                >
                  <Icon name={item.iconName} size={20} />
                </div>
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout */}
      <div className="px-3 pb-2">
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
          className={`
            w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
            text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10
            ${isCollapsed ? 'justify-center px-2' : ''}
          `}
          onMouseEnter={(e) => handleItemHover('Sign Out', e)}
          onMouseLeave={handleItemLeave}
        >
          <div className="shrink-0 text-red-500">
            <Icon name="logout" size={20} />
          </div>
          {!isCollapsed && <span className="font-bold truncate">Sign Out</span>}
        </button>
      </div>

      {/* Tooltip for collapsed state */}
      {isCollapsed && hoveredItem && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {hoveredItem}
          {/* Arrow */}
          <div className="absolute left-0 top-1/2 -translate-x-[4px] -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-zinc-900" />
        </div>
      )}
    </nav>
  )
}

export default Sidebar
