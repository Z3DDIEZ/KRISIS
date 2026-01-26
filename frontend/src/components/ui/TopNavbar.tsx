import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../lib/firebase'
import Icon from './Icon'
import UserMenu from './UserMenu'
import DarkModeToggle from './DarkModeToggle'
import { useDebounce } from '../../utils/useDebounce'

interface TopNavbarProps {
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    onToggleSidebar?: () => void
}

function TopNavbar({ onSearchChange, searchPlaceholder = 'Search applications...', onToggleSidebar }: TopNavbarProps) {
    const [user] = useAuthState(auth)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)
    const navigate = useNavigate()

    const debouncedSearchQuery = useDebounce(searchQuery, 300)

    useEffect(() => {
        if (debouncedSearchQuery !== undefined) {
            onSearchChange?.(debouncedSearchQuery)
            setIsSearching(false)
        }
    }, [debouncedSearchQuery, onSearchChange])

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
        setSearchQuery(e.target.value)
        setIsSearching(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearchChange?.(searchQuery)
            setIsSearching(false)
            // Navigate to applications if not already there or just trigger search
            if (window.location.pathname !== '/applications') {
                navigate('/applications')
            }
        }
    }

    const clearSearch = () => {
        setSearchQuery('')
        onSearchChange?.('')
        searchRef.current?.focus()
    }

    return (
        <header className="topnav" role="banner">
            <div className="topnav__container">
                {/* Sidebar Toggle & Logo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="topnav__hamburger bezel-icon p-2"
                        aria-label="Toggle sidebar"
                    >
                        <Icon name="list" size={20} />
                    </button>

                    <Link to="/" className="topnav__logo" data-track-action="logo-click">
                        <div className="topnav__logo-icon">
                            <Icon name="dashboard" size={20} />
                        </div>
                        <div className="topnav__logo-text">
                            <span className="topnav__logo-name">KRISIS</span>
                            <span className="topnav__logo-tagline">Job Intelligence</span>
                        </div>
                    </Link>
                </div>

                {/* Global Search */}
                <div className={`topnav__search ${searchFocused ? 'topnav__search--focused' : ''} ${isSearching ? 'topnav__search--loading' : ''}`}>
                    <Icon name="search" size={18} className="topnav__search-icon" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder={searchPlaceholder}
                        className="topnav__search-input"
                        aria-label="Search"
                        data-track-action="global-search"
                    />
                    {searchQuery ? (
                        <button
                            onClick={clearSearch}
                            className="topnav__search-clear"
                            aria-label="Clear search"
                        >
                            <Icon name="close" size={14} />
                        </button>
                    ) : (
                        <kbd className="topnav__search-shortcut">⌘K</kbd>
                    )}
                </div>

                {/* Actions */}
                <div className="topnav__actions">
                    {/* Quick Add Button - Now Icon Only as requested */}
                    <Link
                        to="/applications/new"
                        className="topnav__action-btn topnav__action-btn--primary bezel-icon !bg-orange-500 !text-white !border-none shadow-orange-500/20"
                        title="Add Application"
                        data-track-action="quick-add"
                    >
                        <Icon name="add" size={20} />
                    </Link>

                    <div className="w-[1px] h-6 bg-border-light mx-2 hidden md:block" />

                    {/* Dark Mode Toggle */}
                    <DarkModeToggle />

                    <div className="w-[1px] h-6 bg-border-light mx-2 hidden md:block" />

                    {/* User Menu */}
                    {user && <div className="ml-1"><UserMenu /></div>}
                </div>
            </div>
        </header>
    )
}

export default TopNavbar
