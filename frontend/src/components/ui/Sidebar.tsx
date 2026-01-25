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
  items: SidebarItem[]
  primaryItems: SidebarItem[]
  secondaryItems: SidebarItem[]
  isOpen?: boolean
  onClose?: () => void
}

function Sidebar({ items, primaryItems, secondaryItems, isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    const initialCollapsed = saved ? JSON.parse(saved) : false
    setIsCollapsed(initialCollapsed)
    
    // Set initial margin on mount
    setTimeout(() => {
      const mainContent = document.querySelector('.main-content') as HTMLElement
      if (mainContent) {
        mainContent.style.marginLeft = initialCollapsed ? '72px' : '240px'
      }
    }, 0)
  }, [])

  // Update when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    // Update body/data attribute for CSS targeting
    const wrapper = sidebarRef.current?.closest('.sidebar-wrapper')
    const mainContent = document.querySelector('.main-content') as HTMLElement
    if (wrapper) {
      if (isCollapsed) {
        wrapper.setAttribute('data-collapsed', 'true')
        document.body.setAttribute('data-sidebar-collapsed', 'true')
        if (mainContent) {
          mainContent.style.marginLeft = '72px'
        }
      } else {
        wrapper.removeAttribute('data-collapsed')
        document.body.removeAttribute('data-sidebar-collapsed')
        if (mainContent) {
          mainContent.style.marginLeft = '240px'
        }
      }
    }
  }, [isCollapsed])

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed)
  }

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
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <Icon name="dashboard" size={20} />
              </div>
              <div className="sidebar-logo-text">
                <div className="font-bold text-lg">KRISIS</div>
                <div className="text-xs text-secondary">Job Intelligence</div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-logo-collapsed">
              <Icon name="dashboard" size={24} />
            </div>
          )}
          <button
            onClick={handleToggle}
            className="sidebar-toggle"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            <Icon name={isCollapsed ? 'arrow-right' : 'arrow-left'} size={18} />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="sidebar-section">
          <ul className="sidebar-list">
            {primaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                  onMouseEnter={(e) => handleItemHover(item.name, e)}
                  onMouseLeave={handleItemLeave}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <div className="sidebar-item-icon">
                    <Icon name={item.iconName} size={20} />
                  </div>
                  {!isCollapsed && (
                    <span className="sidebar-item-label">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        {!isCollapsed && <div className="sidebar-divider" />}

        {/* Secondary Navigation */}
        <div className="sidebar-section">
          <ul className="sidebar-list">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                  onMouseEnter={(e) => handleItemHover(item.name, e)}
                  onMouseLeave={handleItemLeave}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <div className="sidebar-item-icon">
                    <Icon name={item.iconName} size={20} />
                  </div>
                  {!isCollapsed && (
                    <span className="sidebar-item-label">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
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