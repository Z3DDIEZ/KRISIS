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
    onToggleSidebar?: () => void
}

function TopNavbar({ onSearchChange, onToggleSidebar }: TopNavbarProps) {
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
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearchChange?.(searchQuery)
            setIsSearching(false)
            // Navigate to applications with search param
            if (window.location.pathname !== '/applications') {
                // If onSearchChange is not provided or just generic, force navigation
                // Note: Real implementation might depend on how Applications.tsx reads params
                // But for now, we assume Applications.tsx uses context or we just navigate there.
                // Since TopNavbar uses local state mostly, let's just ensure we switch to the page.
                // Improve: Pass the query via context or URL params if needed.
                navigate('/applications')
                // Ideally we should sync this state to the SearchContext if it exists,
                // but since TopNavbar is often decoupled in this codebase, we rely on parent callback
                // or just the navigation trigger.
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
                {/* Sidebar Toggle & Mobile Logo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="topnav__hamburger bezel-icon p-2"
                        aria-label="Toggle sidebar"
                    >
                        <Icon name="list" size={20} />
                    </button>

                    {/* Logo - Mobile Only (handled by CSS) */}
                    <Link to="/" className="topnav__logo" data-track-action="logo-click">
                        <div className="topnav__logo-icon">
                            <Icon name="dashboard" size={20} />
                        </div>
                        <div className="topnav__logo-text">
                            <span className="topnav__logo-name">KRISIS</span>
                        </div>
                    </Link>
                </div>

                {/* Global Search - Functional Redirect */}
                <div className={`topnav__search bg-gray-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-all ${searchFocused ? 'ring-2 ring-primary-500/20 !border-primary-500' : ''} ${isSearching ? 'opacity-80' : ''}`}>
                    <Icon name="search" size={16} className="text-gray-400 dark:text-gray-500 ml-3" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder="Search applications, companies..."
                        className="bg-transparent border-none focus:ring-0 text-sm w-full h-full px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
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
                    {/* Job Search - External */}
                    <Link
                        to="/jobs"
                        className="topnav__action-btn bezel-icon text-secondary hover:text-primary hover:bg-surface-2 mr-2"
                        title="Search Job Market"
                        data-track-action="job-search"
                    >
                        <Icon name="search" size={20} />
                    </Link>

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
