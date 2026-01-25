import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { exportApplicationsToCsv } from '../utils/exportHelpers'
import { toast } from 'sonner'
import DarkModeToggle from '../components/ui/DarkModeToggle'
import Icon from '../components/ui/Icon'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
  visaSponsorship: boolean
}

function Settings() {
  const [user, loading] = useAuthState(auth)
  const [isDark, setIsDark] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [exportScope, setExportScope] = useState<'all' | 'recent' | 'offers'>('all')

  useEffect(() => {
    if (!user) return

    // Load applications for export stats
    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: Application[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        apps.push({
          id: doc.id,
          company: data.company || '',
          role: data.role || '',
          dateApplied: data.dateApplied || '',
          status: data.status || 'Applied',
          visaSponsorship: Boolean(data.visaSponsorship),
          notes: data.notes,
          resumeUrl: data.resumeUrl
        })
      })
      setApplications(apps)
    })

    return () => unsubscribe()
  }, [user])

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

  const handleExportData = async () => {
    if (!user || applications.length === 0) return

    setIsExporting(true)
    try {
      // Filter applications based on scope
      let dataToExport = applications
      if (exportScope === 'recent') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        dataToExport = applications.filter(app =>
          new Date(app.dateApplied) >= thirtyDaysAgo
        )
      } else if (exportScope === 'offers') {
        dataToExport = applications.filter(app => app.status === 'Offer')
      }

      if (exportFormat === 'csv') {
        await exportApplicationsToCsv(dataToExport)
        toast.success(`Exported ${dataToExport.length} applications to CSV!`)
      } else {
        // JSON export
        const jsonData = {
          exportDate: new Date().toISOString(),
          totalApplications: dataToExport.length,
          applications: dataToExport
        }
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `krisis-applications-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Exported ${dataToExport.length} applications to JSON!`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

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

        {/* Enhanced Data Export Card */}
        <div className="card animate-fade-in-scale">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-sm">
              <Icon name="download" size={20} />
              Data Export & Backup
            </h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Export Stats */}
            <div className="grid grid-cols-4 gap-md mb-lg">
              <div className="text-center p-md bg-background-light rounded-lg">
                <div className="text-2xl font-bold text-primary">{applications.length}</div>
                <div className="text-xs text-secondary uppercase tracking-wide">Total Records</div>
              </div>
              <div className="text-center p-md bg-background-light rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {applications.filter(app => app.status === 'Offer').length}
                </div>
                <div className="text-xs text-secondary uppercase tracking-wide">Offers</div>
              </div>
              <div className="text-center p-md bg-background-light rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {applications.filter(app => app.visaSponsorship).length}
                </div>
                <div className="text-xs text-secondary uppercase tracking-wide">Visa Sponsors</div>
              </div>
              <div className="text-center p-md bg-background-light rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {applications.length > 0
                    ? Math.round((applications.filter(app => app.status !== 'Applied').length / applications.length) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-secondary uppercase tracking-wide">Response Rate</div>
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-lg">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-sm">Export Format</label>
                <div className="flex gap-sm">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`btn ${exportFormat === 'csv' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  >
                    <Icon name="table" size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`btn ${exportFormat === 'json' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  >
                    <Icon name="settings" size={16} />
                    JSON
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-sm">Export Scope</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
                  <button
                    onClick={() => setExportScope('all')}
                    className={`btn ${exportScope === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm justify-start`}
                  >
                    <Icon name="work" size={16} />
                    All Applications ({applications.length})
                  </button>
                  <button
                    onClick={() => setExportScope('recent')}
                    className={`btn ${exportScope === 'recent' ? 'btn-primary' : 'btn-ghost'} btn-sm justify-start`}
                  >
                    <Icon name="trending-up" size={16} />
                    Last 30 Days ({applications.filter(app => {
                      const thirtyDaysAgo = new Date()
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                      return new Date(app.dateApplied) >= thirtyDaysAgo
                    }).length})
                  </button>
                  <button
                    onClick={() => setExportScope('offers')}
                    className={`btn ${exportScope === 'offers' ? 'btn-primary' : 'btn-ghost'} btn-sm justify-start`}
                  >
                    <Icon name="offer" size={16} />
                    Offers Only ({applications.filter(app => app.status === 'Offer').length})
                  </button>
                </div>
              </div>

              {/* Export Features */}
              <div className="bg-background-light p-md rounded-lg">
                <h4 className="font-medium text-primary mb-sm">Export Includes:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm text-sm text-secondary">
                  <div className="flex items-center gap-sm">
                    <Icon name="check" size={14} className="text-green-600" />
                    <span>Company & role information</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Icon name="check" size={14} className="text-green-600" />
                    <span>Application status & dates</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Icon name="check" size={14} className="text-green-600" />
                    <span>Visa sponsorship flags</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Icon name="check" size={14} className="text-green-600" />
                    <span>Notes & additional data</span>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex items-center justify-between pt-md border-t border-border-light">
                <div className="text-sm text-secondary">
                  {exportFormat === 'csv' ? 'UTF-8 encoded CSV with BOM' : 'Structured JSON with metadata'}
                </div>
                <button
                  onClick={handleExportData}
                  disabled={isExporting || applications.length === 0}
                  className="btn btn-primary"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-t-transparent mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={16} />
                      Export {applications.length > 0 ? applications.length : ''} Records
                    </>
                  )}
                </button>
              </div>

              {applications.length === 0 && (
                <div className="text-center p-md bg-yellow-50 border border-yellow-200 rounded-lg mt-md">
                  <Icon name="warning" size={16} className="text-yellow-600 mb-sm" />
                  <p className="text-yellow-800 text-sm font-medium">No data to export</p>
                  <p className="text-yellow-700 text-xs">Add some applications first to create a backup</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings