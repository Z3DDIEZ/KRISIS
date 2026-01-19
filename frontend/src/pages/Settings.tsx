import { useState, useEffect } from 'react'
import DarkModeToggle from '../components/ui/DarkModeToggle'

function Settings() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    setIsDark(savedTheme === 'dark' || (!savedTheme && prefersDark))

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') === 'dark')
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="max-w-4xl mx-auto" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-secondary text-base mt-sm">Manage your account and preferences</p>
      </div>

      {/* Settings Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

        {/* Appearance Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Appearance</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div className="input-group">
              <label className="input-label">Theme</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-secondary text-sm">
                  {isDark ? 'Currently in dark mode' : 'Currently in light mode'}
                </span>
                <DarkModeToggle />
              </div>
            </div>
          </div>
        </div>
        
        {/* Account Settings Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Settings</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div className="input-group">
              <label htmlFor="email-notifications" className="input-label">
                Email Notifications
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <input
                  type="checkbox"
                  id="email-notifications"
                  className="checkbox"
                />
                <span className="text-sm text-secondary">
                  Receive weekly progress summaries
                </span>
              </div>
            </div>

            <div className="border-t border-border-light" style={{ paddingTop: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
              <h4 className="text-sm font-semibold text-primary mb-md">Danger Zone</h4>
              <button className="btn btn-secondary" style={{ color: 'var(--status-rejected)', borderColor: 'var(--status-rejected)' }}>
                🗑️ Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Data Export Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Data Export</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <p className="text-secondary mb-lg">
              Download all your application data in CSV format.
            </p>
            <button className="btn btn-orange">
              📥 Export Data
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings