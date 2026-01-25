import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../lib/firebase'
import Icon from './Icon'
import UserMenu from './UserMenu'
import DarkModeToggle from './DarkModeToggle'

interface TopNavbarProps {
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
}

function TopNavbar({ onSearchChange, searchPlaceholder = 'Search applications...' }: TopNavbarProps) {
    const [user] = useAuthState(auth)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    // Handle keyboard shortcut (Ctrl/Cmd + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchRef.current?.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        onSearchChange?.(value)
    }

    return (
        <header className="topnav" role="banner">
            <div className="topnav__container">
                {/* Logo */}
                <Link to="/" className="topnav__logo" data-track-action="logo-click">
                    <div className="topnav__logo-icon">
                        <Icon name="dashboard" size={20} />
                    </div>
                    <div className="topnav__logo-text">
                        <span className="topnav__logo-name">KRISIS</span>
                        <span className="topnav__logo-tagline">Job Intelligence</span>
                    </div>
                </Link>

                {/* Global Search */}
                <div className={`topnav__search ${searchFocused ? 'topnav__search--focused' : ''}`}>
                    <Icon name="search" size={18} className="topnav__search-icon" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder={searchPlaceholder}
                        className="topnav__search-input"
                        aria-label="Search"
                        data-track-action="global-search"
                    />
                    <kbd className="topnav__search-shortcut">⌘K</kbd>
                </div>

                {/* Actions */}
                <div className="topnav__actions">
                    {/* Quick Add Button */}
                    <Link
                        to="/applications/new"
                        className="topnav__action-btn topnav__action-btn--primary"
                        data-track-action="quick-add"
                    >
                        <Icon name="add" size={18} />
                        <span className="topnav__action-label">Add</span>
                    </Link>

                    {/* Dark Mode Toggle */}
                    <DarkModeToggle />

                    {/* User Menu */}
                    {user && <UserMenu />}
                </div>
            </div>
        </header>
    )
}

export default TopNavbar
