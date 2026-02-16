import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

interface DropdownItem {
  label: string
  icon?: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  separator?: boolean
  children?: DropdownItem[]
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  className?: string
  disabled?: boolean
}

function Dropdown({
  trigger,
  items,
  position = 'bottom-left',
  className = '',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const updatePosition = () => {
      if (!isOpen || !triggerRef.current) return

      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let top = rect.bottom + 8
      let left = rect.left

      // Adjust position based on specified position
      switch (position) {
        case 'bottom-right':
          left = rect.right - 200 // Assuming dropdown width
          break
        case 'top-left':
          top = rect.top - 300 // Assuming dropdown height
          break
        case 'top-right':
          top = rect.top - 300
          left = rect.right - 200
          break
        default: // bottom-left
          break
      }

      // Ensure dropdown stays within viewport
      if (top + 300 > viewportHeight) {
        top = rect.top - 300
      }
      if (left + 200 > viewportWidth) {
        left = viewportWidth - 200 - 16
      }
      if (left < 16) {
        left = 16
      }

      setDropdownStyle({ top, left })
    }

    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, position])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setActiveSubmenu(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setActiveSubmenu(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return

    if (item.children) {
      setActiveSubmenu(activeSubmenu === item.label ? null : item.label)
      return
    }

    if (item.onClick) {
      item.onClick()
    }
    setIsOpen(false)
    setActiveSubmenu(null)
  }
  // removed getDropdownPosition from here

  const renderMenuItem = (item: DropdownItem, depth = 0) => {
    if (item.separator) {
      return <div key={`separator-${depth}`} className="border-t border-border-light my-1" />
    }

    const hasChildren = item.children && item.children.length > 0
    const isSubmenuActive = activeSubmenu === item.label

    return (
      <div key={item.label} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={`
            w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-light transition-all duration-200
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${item.danger ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-primary hover:text-primary-orange'}
            ${depth > 0 ? 'pl-8' : ''}
          `}
        >
          {item.icon && <Icon name={item.icon} size={16} />}
          <span className="flex-1">{item.label}</span>
          {hasChildren && (
            <Icon
              name="arrow-right"
              size={14}
              className={`transition-transform duration-200 ${isSubmenuActive ? 'rotate-90' : ''}`}
            />
          )}
        </button>

        {/* Submenu */}
        {hasChildren && isSubmenuActive && (
          <div className="absolute left-full top-0 ml-1 bg-background-white border border-border-light rounded-lg shadow-lg min-w-48 animate-slide-in-right">
            {item.children!.map((child) => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (disabled) {
    return <div className={className}>{trigger}</div>
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 bg-background-white border border-border-light rounded-lg shadow-xl min-w-48 animate-fade-in-scale"
            style={dropdownStyle}
          >
            <div className="py-2">{items.map((item) => renderMenuItem(item))}</div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default Dropdown
