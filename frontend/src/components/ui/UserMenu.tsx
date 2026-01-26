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

  const nameParts = cleanName.split(' ').filter(part => part.length > 0 && !part.startsWith('(') && !part.endsWith(')'))
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
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const initials = getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon hover-lift transition-all"
        style={{
          background: 'var(--primary-500)',
          color: 'var(--text-on-contrast)',
          width: '42px',
          height: '42px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 'var(--font-black)',
          fontSize: '14px',
          boxShadow: 'var(--shadow-md)'
        }}
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="card absolute right-0 mt-sm w-72 shadow-xl z-50 animate-slide-up">
          <div className="p-md border-b border-border-light">
            <div className="flex items-center gap-md">
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl shadow-inner"
                style={{
                  background: 'var(--surface-contrast)',
                  color: 'var(--text-on-contrast)'
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary truncate">
                  {user.displayName || 'No name set'}
                </p>
                <p className="text-sm text-secondary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-primary hover:bg-surface-2 rounded-lg transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="person" size={16} />
              View Profile
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-primary hover:bg-surface-2 rounded-lg transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="settings" size={16} />
              Settings
            </Link>

            <hr className="my-2 border-border-light" />

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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