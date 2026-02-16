import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { exportApplicationsToCsv } from '../utils/exportHelpers'
import { toast } from 'sonner'
import DarkModeToggle from '../components/ui/DarkModeToggle'
import Icon from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

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
          resumeUrl: data.resumeUrl,
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
      attributeFilter: ['data-theme'],
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
        dataToExport = applications.filter((app) => new Date(app.dateApplied) >= thirtyDaysAgo)
      } else if (exportScope === 'offers') {
        dataToExport = applications.filter((app) => app.status === 'Offer')
      }

      if (exportFormat === 'csv') {
        await exportApplicationsToCsv(dataToExport)
        toast.success(`Exported ${dataToExport.length} applications to CSV!`)
      } else {
        // JSON export
        const jsonData = {
          exportDate: new Date().toISOString(),
          totalApplications: dataToExport.length,
          applications: dataToExport,
        }
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: 'application/json',
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
    <div className="max-w-4xl mx-auto animate-fade-in font-primary p-6 space-y-8">
      <header className="mb-2">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Settings
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          Manage your account preferences and data
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {/* Main Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Appearance Card */}
          <Card className="p-6">
            <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Icon name="palette" size={18} className="text-primary-500" />
                Appearance
              </h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary-500/20 transition-all">
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Theme</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {isDark ? 'Dark mode is active' : 'Light mode is active'}
                </div>
              </div>
              <DarkModeToggle />
            </div>
          </Card>

          {/* Account Settings Card */}
          <Card className="p-6">
            <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Icon name="bolt" size={18} className="text-primary-500" />
                Notifications
              </h3>
            </div>

            <label className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="checkbox"
                id="email-notifications"
                className="mt-1 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                defaultChecked
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-zinc-900 dark:text-white mb-0.5">
                  Weekly Summaries
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Receive weekly progress reports and AI insights via email
                </div>
              </div>
            </label>
          </Card>
        </div>

        {/* Enhanced Data Export Card */}
        <Card className="p-8">
          <div className="mb-8 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Icon name="download" size={20} className="text-primary-500" />
              Data Export
            </h3>
          </div>

          <div className="space-y-8">
            {/* Export Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-zinc-900 text-white rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold mb-1">{applications.length}</div>
                  <div className="text-xs font-bold opacity-70 uppercase tracking-wide">
                    Total Apps
                  </div>
                </div>
                <Icon
                  name="work"
                  size={48}
                  className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity"
                />
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
                    {applications.filter((app) => app.status === 'Offer').length}
                  </div>
                  <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Offers
                  </div>
                </div>
                <Icon
                  name="verified"
                  size={48}
                  className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"
                />
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
                    {applications.filter((app) => app.visaSponsorship).length}
                  </div>
                  <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Visa Sponsored
                  </div>
                </div>
                <Icon
                  name="public"
                  size={48}
                  className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"
                />
              </div>

              <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-200 dark:border-primary-800/30 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-primary-600 mb-1">
                    {applications.length > 0
                      ? Math.round(
                          (applications.filter((app) => app.status !== 'Applied').length /
                            applications.length) *
                            100
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wide">
                    Active
                  </div>
                </div>
                <Icon
                  name="bolt"
                  size={48}
                  className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity"
                />
              </div>
            </div>

            {/* Export Controls */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Format Selection */}
                <div className="form-group">
                  <label className="text-sm font-bold text-zinc-900 dark:text-white mb-2 block">
                    Format
                  </label>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${exportFormat === 'csv' ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary-600' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                    >
                      <Icon name="table" size={16} />
                      CSV (Excel)
                    </button>
                    <button
                      onClick={() => setExportFormat('json')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${exportFormat === 'json' ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary-600' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                    >
                      <Icon name="code" size={16} />
                      JSON
                    </button>
                  </div>
                </div>

                {/* Scope Selection */}
                <div className="form-group">
                  <label className="text-sm font-bold text-zinc-900 dark:text-white mb-2 block">
                    Export Scope
                  </label>
                  <div className="relative">
                    <select
                      value={exportScope}
                      onChange={(e) =>
                        setExportScope(e.target.value as 'all' | 'recent' | 'offers')
                      }
                      className="w-full h-[42px] px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all appearance-none"
                    >
                      <option value="all">All Applications ({applications.length})</option>
                      <option value="recent">Past 30 Days</option>
                      <option value="offers">Offers Only</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <Icon name="expand_more" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <Icon name="info" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                      Export Details
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-md">
                      Your export will include all companies, roles, status history, and personal
                      notes.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleExportData}
                  disabled={isExporting || applications.length === 0}
                  variant="primary"
                  className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      <span className="font-bold text-xs">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={18} />
                      <span className="font-bold text-xs uppercase tracking-wide">
                        Download Data
                      </span>
                    </>
                  )}
                </Button>
              </div>

              {applications.length === 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
                  <Icon name="warning" size={18} />
                  <span className="text-xs font-bold">No application data found to export.</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Support & Community Section */}
        <Card className="p-8 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20 shadow-none">
          <div className="text-center">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Need Help?</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
              Check out our documentation or contact support.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="secondary" size="sm">
                Documentation
              </Button>
              <Button variant="secondary" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Settings
