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
  const [user] = useAuthState(auth)
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
    <div className="max-w-4xl mx-auto py-8 animate-fade-in font-primary">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-secondary font-medium mt-1">Configure your workspace and manage your application data</p>
      </div>

      {/* Settings Grid */}
      <div className="flex flex-col gap-xl">

        {/* Main Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          {/* Appearance Card */}
          <div className="card border border-border-light hover:shadow-lg transition-all">
            <div className="card-header border-b border-border-light">
              <h3 className="card-title flex items-center gap-2">
                <Icon name="palette" size={18} />
                Appearance
              </h3>
            </div>
            <div className="card-body p-xl">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border-light group hover:border-primary-orange/20 transition-all">
                <div>
                  <div className="text-sm font-bold text-primary mb-0.5">Interface Theme</div>
                  <div className="text-xs text-secondary font-medium">
                    {isDark ? 'Dark mode optimized' : 'Light mode active'}
                  </div>
                </div>
                <DarkModeToggle />
              </div>
            </div>
          </div>

          {/* Account Settings Card */}
          <div className="card border border-border-light hover:shadow-lg transition-all">
            <div className="card-header border-b border-border-light">
              <h3 className="card-title flex items-center gap-2">
                <Icon name="notifications" size={18} />
                Global Preferences
              </h3>
            </div>
            <div className="card-body p-xl">
              <label className="checkbox-group p-4 bg-surface-2 rounded-2xl border border-border-light group hover:border-primary-orange/20 transition-all cursor-pointer">
                <div className="flex-1">
                  <div className="text-sm font-bold text-primary mb-0.5">Email Summaries</div>
                  <div className="text-xs text-secondary font-medium">Weekly progress & AI insights</div>
                </div>
                <input
                  type="checkbox"
                  id="email-notifications"
                  className="checkbox"
                  defaultChecked
                />
              </label>
            </div>
          </div>
        </div>

        {/* Enhanced Data Export Card */}
        <div className="card border border-border-light overflow-hidden shadow-xl">
          <div className="card-header border-b border-border-light bg-surface-1">
            <h3 className="card-title flex items-center gap-2">
              <Icon name="download" size={20} className="text-primary-orange" />
              Data Intelligence & Export
            </h3>
          </div>
          <div className="card-body p-xl">
            {/* Export Stats - Bauhaus Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-xl">
              <div className="p-5 bg-navy-light text-white rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold mb-1">{applications.length}</div>
                  <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Total Pipeline</div>
                </div>
                <Icon name="work" size={60} className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity" />
              </div>

              <div className="p-5 bg-surface-2 rounded-2xl border border-border-light relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {applications.filter(app => app.status === 'Offer').length}
                  </div>
                  <div className="text-[10px] font-bold text-secondary uppercase tracking-widest">Successful Offers</div>
                </div>
                <Icon name="verified" size={60} className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity" />
              </div>

              <div className="p-5 bg-surface-2 rounded-2xl border border-border-light relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {applications.filter(app => app.visaSponsorship).length}
                  </div>
                  <div className="text-[10px] font-bold text-secondary uppercase tracking-widest">Visa Sponsored</div>
                </div>
                <Icon name="public" size={60} className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity" />
              </div>

              <div className="p-5 bg-primary-orange-bg rounded-2xl border border-primary-orange/10 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-primary-orange mb-1">
                    {applications.length > 0
                      ? Math.round((applications.filter(app => app.status !== 'Applied').length / applications.length) * 100)
                      : 0}%
                  </div>
                  <div className="text-[10px] font-bold text-primary-orange/70 uppercase tracking-widest">Engagement</div>
                </div>
                <Icon name="trending_up" size={60} className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity" />
              </div>
            </div>

            {/* Export Controls */}
            <div className="space-y-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
                {/* Format Selection */}
                <div className="form-group">
                  <label className="form-label">Export Format</label>
                  <div className="flex bg-surface-2 p-1 rounded-xl border border-border-light">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${exportFormat === 'csv' ? 'bg-background-white shadow-sm text-primary-orange border border-border-light' : 'text-secondary hover:text-primary'}`}
                    >
                      <Icon name="table" size={16} />
                      CSV (Excel)
                    </button>
                    <button
                      onClick={() => setExportFormat('json')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${exportFormat === 'json' ? 'bg-background-white shadow-sm text-primary-orange border border-border-light' : 'text-secondary hover:text-primary'}`}
                    >
                      <Icon name="code" size={16} />
                      JSON (Data)
                    </button>
                  </div>
                </div>

                {/* Scope Selection */}
                <div className="form-group">
                  <label className="form-label">Export Scope</label>
                  <div className="select-wrapper">
                    <select
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value as any)}
                      className="input"
                    >
                      <option value="all">Entire Application History ({applications.length})</option>
                      <option value="recent">Recent 30 Days Only</option>
                      <option value="offers">Successful Offers Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="p-6 bg-surface-2 border border-border-light rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-orange/10 rounded-xl flex items-center justify-center text-primary-orange flex-shrink-0 mt-1">
                    <Icon name="info" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Data Integrity Check</h4>
                    <p className="text-xs text-secondary font-medium leading-relaxed">
                      Your export will include all companies, roles, status history, and personal notes.
                      Encrypted with UTF-8 for maximum compatibility.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExportData}
                  disabled={isExporting || applications.length === 0}
                  className="btn btn-orange px-8 py-3 h-auto flex flex-col items-center gap-1 shadow-lg shadow-primary-orange/20 min-w-[200px]"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      <span className="font-bold uppercase tracking-tighter text-xs">Processing...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Icon name="download" size={18} />
                        <span className="font-bold uppercase tracking-tight">Generate Backup</span>
                      </div>
                      <span className="text-[10px] opacity-70 font-medium">Ready for download</span>
                    </>
                  )}
                </button>
              </div>

              {applications.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center gap-3">
                  <Icon name="warning" size={18} className="text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-800">No data records found to export.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Support & Community Section */}
        <div className="card border border-border-light bg-surface-2 border-dashed">
          <div className="card-body p-xl text-center">
            <h4 className="text-sm font-bold text-primary mb-2">Need Help?</h4>
            <p className="text-xs text-secondary mb-6 max-w-sm mx-auto">Access our documentation or contact the design team for support with your job intelligence pipeline.</p>
            <div className="flex justify-center gap-4">
              <button className="btn btn--secondary btn--sm font-bold">Documentation</button>
              <button className="btn btn--secondary btn--sm font-bold">Feedback</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings