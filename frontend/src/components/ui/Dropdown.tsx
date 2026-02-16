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
      return (
        <div
          key={`separator-${depth}`}
          className="border-t border-zinc-100 dark:border-zinc-800/60 my-1"
        />
      )
    }

    const hasChildren = item.children && item.children.length > 0
    const isSubmenuActive = activeSubmenu === item.label

    return (
      <div key={item.label} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={`
            w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
            ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            ${item.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10' : 'text-zinc-600 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/5'}
            ${depth > 0 ? 'pl-8' : ''}
          `}
        >
          {item.icon && <Icon name={item.icon} size={16} />}
          <span className="flex-1 text-[11px] font-black uppercase tracking-wider">
            {item.label}
          </span>
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
          <div className="absolute left-full top-0 ml-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl min-w-48 animate-fade-in overflow-hidden">
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
            className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] min-w-56 animate-fade-in overflow-hidden"
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
