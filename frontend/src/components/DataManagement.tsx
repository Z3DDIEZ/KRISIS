import { useState, useEffect, useRef } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { DataRecord, ImportResult, ImportProgress } from '../types/dataManagement'
import { exportApplicationsToCsv } from '../utils/exportHelpers'
import { importCsvFromFile, validateCsvFile } from '../utils/importHelpers'
import { toast } from 'sonner'
import Icon from './ui/Icon'
import DemoDataButton from './DemoDataButton'

interface DataManagementProps {
  onDataChange?: () => void
}

function DataManagement({ onDataChange }: DataManagementProps) {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<DataRecord[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing applications in real-time
  useEffect(() => {
    if (!user) {
      setIsLoadingData(false)
      return
    }

    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: DataRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        apps.push({
          id: doc.id,
          company: data.company || '',
          role: data.role || '',
          dateApplied: data.dateApplied || '',
          status: data.status || 'Applied',
          visaSponsorship: Boolean(data.visaSponsorship),
          ...(data.notes && { notes: data.notes }),
          ...(data.resumeUrl && { resumeUrl: data.resumeUrl }),
          ...(data.createdAt && { createdAt: data.createdAt }),
          ...(data.updatedAt && { updatedAt: data.updatedAt })
        })
      })
      setApplications(apps)
      setIsLoadingData(false)
    }, (error) => {
      console.error('Error loading applications:', error)
      toast.error('Failed to load applications')
      setIsLoadingData(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleExportCsv = () => {
    const success = exportApplicationsToCsv(applications, {
      filename: `krisis-applications-${new Date().toISOString().split('T')[0]}.csv`
    })

    if (success) {
      toast.success('Data exported successfully!')
    }
  }

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateCsvFile(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    setIsImporting(true)
    setImportProgress({ loaded: 0, total: file.size, rowsProcessed: 0, errors: 0 })

    try {
      const result: ImportResult = await importCsvFromFile(file, (progress) => {
        setImportProgress(progress)
      })

      if (result.success) {
        // Import successful applications to database
        if (result.imported.length > 0 && user) {
          const importPromises = result.imported.map(async (record) => {
            try {
              // Create clean document data with only the required fields
              const docData = {
                userId: user.uid,
                company: record.company,
                role: record.role,
                status: record.status,
                dateApplied: record.dateApplied,
                visaSponsorship: record.visaSponsorship,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Only include optional fields if they exist
                ...(record.notes && { notes: record.notes }),
                ...(record.resumeUrl && { resumeUrl: record.resumeUrl })
              }

              return await addDoc(collection(db, `users/${user.uid}/applications`), docData)
            } catch (error) {
              console.error('Error creating document for record:', record, error)
              throw error
            }
          })

          await Promise.all(importPromises)
        }

        // Show results
        if (result.imported.length > 0) {
          toast.success(`Successfully imported ${result.imported.length} applications!`)
        }

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} rows had errors and were skipped. Check console for details.`)
          console.log('Import errors:', result.errors)
        }

        if (result.skipped > 0) {
          toast.info(`${result.skipped} rows were skipped due to validation errors.`)
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Notify parent of data change
        onDataChange?.()

      } else {
        toast.error('Import failed. Please check your CSV file format.')
        if (result.errors.length > 0) {
          console.log('Import errors:', result.errors)
        }
      }

    } catch (error: unknown) {
      console.error('Import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Import failed: ${errorMessage}`)
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  if (loading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary">Please sign in to manage your data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="heading-xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-500 inline-block">
          Data Management
        </h2>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Import, export, and generate demo data for your applications
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="premium-card p-6 flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-text-primary">{applications.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1">Total Applications</div>
          </div>
          <div className="p-3 bg-primary-100 text-primary-600 rounded-lg">
            <Icon name="work" size={24} />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-text-primary">
              {applications.filter(app => app.status === 'Offer').length}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1">Offers Received</div>
          </div>
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <Icon name="check-circle" size={24} />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-text-primary">
              {applications.length > 0
                ? Math.round((applications.filter(app => app.status === 'Offer').length / applications.length) * 100)
                : 0}%
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1">Success Rate</div>
          </div>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Icon name="chart" size={24} />
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="premium-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
            <div className="p-2 bg-primary-600/10 text-primary-600 rounded-lg">
              <Icon name="download" size={20} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Export Data</h3>
          </div>

          <div className="space-y-6">
            {/* Export Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-subtle">
                <div className="text-2xl font-black text-text-primary">{applications.length}</div>
                <div className="text-xs font-bold uppercase text-text-secondary mt-1">Records</div>
              </div>
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-subtle">
                <div className="text-lg font-bold text-text-primary">
                  {new Date().toLocaleDateString()}
                </div>
                <div className="text-xs font-bold uppercase text-text-secondary mt-1">Date</div>
              </div>
            </div>

            {/* Export Details */}
            <div className="text-sm text-text-secondary space-y-2 bg-bg-subtle/50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-bold text-text-primary">CSV (UTF-8)</span>
              </div>
              <div className="flex justify-between">
                <span>Columns:</span>
                <span className="font-bold text-text-primary">Company, Role, Status...</span>
              </div>
              <div className="flex justify-between">
                <span>Est. Size:</span>
                <span className="font-bold text-text-primary">~{Math.round(applications.length * 0.1)} KB</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Download your full dataset for backup or analysis. Contains all application details and notes.
            </p>

            <button
              onClick={handleExportCsv}
              disabled={applications.length === 0}
              className="btn btn-primary w-full justify-center py-3"
            >
              <Icon name="download" size={18} />
              Export CSV
            </button>

            {applications.length === 0 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-xs">
                <Icon name="warning" size={14} />
                <span>No applications to export yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Import Card */}
        <div className="premium-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
            <div className="p-2 bg-primary-600/10 text-primary-600 rounded-lg">
              <Icon name="add" size={20} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Import Data</h3>
          </div>

          <div className="space-y-6">
            {/* Import Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-bg-subtle p-3 rounded-lg border border-border-subtle">
                <div className="font-bold text-text-primary">CSV</div>
                <div className="text-[10px] uppercase text-text-secondary">Type</div>
              </div>
              <div className="bg-bg-subtle p-3 rounded-lg border border-border-subtle">
                <div className="font-bold text-text-primary">5MB</div>
                <div className="text-[10px] uppercase text-text-secondary">Limit</div>
              </div>
              <div className="bg-bg-subtle p-3 rounded-lg border border-border-subtle">
                <div className="font-bold text-text-primary">Auto</div>
                <div className="text-[10px] uppercase text-text-secondary">Check</div>
              </div>
            </div>

            {/* Import Features */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Icon name="check" size={12} className="text-green-600" />
                <span>Smart date & status detection</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Icon name="check" size={12} className="text-green-600" />
                <span>Visa sponsorship mapping</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Icon name="check" size={12} className="text-green-600" />
                <span>Detailed error reporting</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Upload a CSV to bulk-import applications. We'll validate the data structure automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />

            <button
              onClick={handleFileSelect}
              disabled={isImporting}
              className="btn btn-secondary w-full justify-center py-3"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-inherit border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Icon name="upload" size={16} />
                  Select CSV File
                </>
              )}
            </button>

            {importProgress && (
              <div className="mt-6 p-4 bg-bg-subtle rounded-xl border border-border-subtle space-y-4 animate-fade-in">
                {/* Progress Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-text-secondary">Importing...</span>
                  <span className="text-sm font-black text-primary-600">
                    {Math.round((importProgress.loaded / importProgress.total) * 100)}%
                  </span>
                </div>

                {/* Main Progress Bar */}
                <div className="w-full bg-border-subtle rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(importProgress.loaded / importProgress.total) * 100}%` }}
                  />
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-text-primary">{importProgress.rowsProcessed}</div>
                    <div className="text-[10px] uppercase text-text-secondary">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${importProgress.errors > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {importProgress.errors}
                    </div>
                    <div className="text-[10px] uppercase text-text-secondary">Errors</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Data Card */}
      <div className="premium-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-600/10 text-primary-600 rounded-lg">
            <Icon name="settings" size={20} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">Demo Data Generator</h3>
        </div>
        <p className="text-sm text-text-secondary mb-6 max-w-3xl">
          Instantly generate 30 realistic sample applications to test the dashboard, analytics, and search features.
        </p>

        <div className="flex justify-start">
          <DemoDataButton
            onDataGenerated={onDataChange}
            className="btn btn-secondary"
          />
        </div>
      </div>

      {/* File Format Help */}
      <div className="premium-card p-6 md:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">CSV Format Guide</h3>
        <div className="bg-bg-subtle p-4 rounded-lg border border-border-subtle font-mono text-xs text-text-secondary overflow-x-auto">
          <div className="mb-2 text-text-primary font-bold">Recommended Headers:</div>
          <div>company, role, dateApplied, status, visaSponsorship, notes</div>
          <div className="mt-4 mb-2 text-text-primary font-bold">Sample Row:</div>
          <div className="text-text-muted">Google, Software Engineer, 2024-01-15, Applied, true, "Referral from John"</div>
        </div>
      </div>
    </div>
  )
}

export default DataManagement