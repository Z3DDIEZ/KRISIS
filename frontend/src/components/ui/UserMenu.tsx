import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../lib/firebase'
import { toast } from 'sonner'
import Icon from './Icon'

function getInitials(displayName: string | null): string {
  if (!displayName || displayName.trim() === '') {
    return ''
  }

  // Remove parenthetical parts (like "(LORDZEDDATHON)")
  const cleanName = displayName.replace(/\([^)]*\)/g, '').trim()

  const nameParts = cleanName
    .split(' ')
    .filter((part) => part.length > 0 && !part.startsWith('(') && !part.endsWith(')'))
  if (nameParts.length === 0) return ''

  if (nameParts.length === 1) {
    // If only one name, take first two letters
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  // Take first letter of first name and first letter of last name
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
}

function UserMenu() {
  const [user] = useAuthState(auth)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success('Signed out successfully')
      navigate('/auth')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  if (!user) return null

  const initials = getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[42px] h-[42px] flex items-center justify-center rounded-xl font-black text-sm bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:scale-105 transition-all duration-200"
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 animate-fade-in divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl bg-zinc-900 dark:bg-zinc-800 text-white shadow-inner">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-zinc-900 dark:text-white truncate">
                  {user.displayName || 'Anonymous User'}
                </p>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="person" size={16} />
              View Profile
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="settings" size={16} />
              Settings
            </Link>
          </div>

          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
            >
              <Icon name="logout" size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
