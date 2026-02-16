import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../lib/firebase'
import Icon from './Icon'
import UserMenu from './UserMenu'
import DarkModeToggle from './DarkModeToggle'
import { Button } from './Button'
import { useSearch } from '../../hooks/use-search'

interface TopNavbarProps {
  onToggleSidebar?: () => void
}

function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const [user] = useAuthState(auth)
  const { searchQuery, setSearchQuery } = useSearch()
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Context already handles search query. No need for local debouncing or props here anymore.

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
      if (window.location.pathname !== '/applications') {
        navigate('/applications')
      }
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    searchRef.current?.focus()
  }

  return (
    <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 flex items-center justify-between gap-4 transition-all duration-200 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-white/10 dark:border-zinc-800/50">
      {/* Sidebar Toggle & Mobile Logo */}
      <div className="flex items-center gap-4">
        {/* Mobile Toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Icon name="list" size={24} />
        </button>

        {/* Sidebar Collapse Toggle (Desktop) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 -ml-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle layout"
        >
          <Icon name="sidebar" size={20} />
        </button>

        {/* Mobile Brand */}
        <Link to="/" className="lg:hidden flex items-center gap-2">
          <div className="text-primary-600">
            <Icon name="dashboard" size={24} />
          </div>
          <span className="font-black text-lg tracking-tighter text-zinc-900 dark:text-white">
            KRISIS
          </span>
        </Link>
      </div>

      {/* Global Search */}
      <div
        className={`
          flex-1 max-w-xl mx-auto
          flex items-center gap-3 px-5 py-2.5 
          bg-zinc-100/30 dark:bg-zinc-900/40 
          border border-zinc-200/50 dark:border-zinc-800/50 hover:border-primary-500/30 dark:hover:border-primary-500/30
          rounded-2xl transition-all duration-300
          ${searchFocused ? 'bg-white dark:bg-zinc-950 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-primary-500/20' : ''}
        `}
      >
        <Icon
          name="search"
          size={18}
          className={`transition-colors duration-300 ${searchFocused ? 'text-primary-500' : 'text-zinc-400'}`}
        />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="SEARCH INTELLIGENCE DATABASE... (Cmd+K)"
          className="w-full bg-transparent border-none focus:ring-0 p-0 text-[10px] font-black uppercase tracking-widest placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 outline-none"
          aria-label="Search"
          data-track-action="global-search"
        />
        {searchQuery ? (
          <button
            onClick={clearSearch}
            className="text-zinc-400 hover:text-primary-600 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-black text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded border border-zinc-300 dark:border-zinc-700 uppercase tracking-tighter">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Job Search */}
        <Link
          to="/jobs"
          className="p-2 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
          title="Search Job Market"
        >
          <Icon name="search" size={20} />
        </Link>

        {/* Quick Add (Desktop) */}
        <div className="hidden sm:block">
          <Button
            onClick={() => navigate('/applications/new')}
            variant="primary"
            size="sm"
            className="gap-2"
          >
            <Icon name="add" size={18} />
            <span>New</span>
          </Button>
        </div>

        {/* Quick Add (Mobile) */}
        <Link
          to="/applications/new"
          className="sm:hidden p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
          title="Add Application"
        >
          <Icon name="add" size={24} />
        </Link>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

        <DarkModeToggle />

        {user && (
          <div className="ml-1 pl-1">
            <UserMenu />
          </div>
        )}
      </div>
    </header>
  )
}

export default TopNavbar
