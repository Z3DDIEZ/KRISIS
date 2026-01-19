import { Link, useLocation } from 'react-router-dom'
import UserMenu from '../components/ui/UserMenu'

interface MainLayoutProps {
  children: React.ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Applications', href: '/applications', icon: '📋' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-background-light">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">
              🎯
            </div>
            <div>
              <div className="font-bold">KRISIS</div>
              <div className="text-xs text-secondary hidden sm:block">Job Application Intelligence</div>
            </div>
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="hidden md:flex w-64 bg-background-white shadow-md min-h-[calc(100vh-4rem)] border-r border-border-light">
          <div className="p-lg w-full">
            <ul className="space-y-xs">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`nav-link ${
                      location.pathname === item.href ? 'active' : ''
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-lg md:p-xl">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout