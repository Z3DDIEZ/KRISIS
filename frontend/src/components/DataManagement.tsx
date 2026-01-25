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

    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(`Import failed: ${error.message}`)
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
    <div className="space-y-lg">
      {/* Header */}
      <div className="text-center mb-xl">
        <h2 className="text-2xl font-bold text-primary mb-sm">Data Management</h2>
        <p className="text-secondary">Import, export, and generate demo data for your applications</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-value text-primary">{applications.length}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Total Applications</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-value text-primary">
              {applications.filter(app => app.status === 'Offer').length}
            </div>
            <div className="stat-label text-secondary uppercase tracking-wide">Offers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-value text-primary">
              {applications.length > 0
                ? Math.round((applications.filter(app => app.status === 'Offer').length / applications.length) * 100)
                : 0}%
            </div>
            <div className="stat-label text-secondary uppercase tracking-wide">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Export Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-sm">
              <Icon name="download" size={20} />
              Export Data
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-md">
              {/* Export Stats */}
              <div className="grid grid-cols-2 gap-sm text-center">
                <div className="bg-background-light p-sm rounded-lg">
                  <div className="text-lg font-semibold text-primary">{applications.length}</div>
                  <div className="text-xs text-secondary">Total Records</div>
                </div>
                <div className="bg-background-light p-sm rounded-lg">
                  <div className="text-lg font-semibold text-primary">
                    {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-xs text-secondary">Export Date</div>
                </div>
              </div>

              {/* Export Details */}
              <div className="text-sm text-secondary space-y-xs">
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="font-medium">CSV (UTF-8 with BOM)</span>
                </div>
                <div className="flex justify-between">
                  <span>Columns:</span>
                  <span className="font-medium">6 (Company, Role, Date, Status, Visa, Notes)</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span className="font-medium">~{Math.round(applications.length * 0.1)} KB</span>
                </div>
              </div>

              <p className="text-secondary text-sm">
                Download all your application data as a CSV file for backup, analysis, or migration to other tools.
              </p>

              <button
                onClick={handleExportCsv}
                disabled={applications.length === 0}
                className="btn btn-primary btn-block"
              >
                <Icon name="download" size={16} />
                Export {applications.length} Records to CSV
              </button>

              {applications.length === 0 && (
                <div className="text-center p-md bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Icon name="warning" size={16} className="text-yellow-600 mb-sm" />
                  <p className="text-yellow-800 text-sm font-medium">No data to export</p>
                  <p className="text-yellow-700 text-xs">Add some applications first to create an export</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-sm">
              <Icon name="add" size={20} />
              Import Data
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-md">
              {/* Import Stats */}
              <div className="grid grid-cols-3 gap-sm text-center">
                <div className="bg-background-light p-sm rounded-lg">
                  <div className="text-lg font-semibold text-primary">CSV</div>
                  <div className="text-xs text-secondary">Format</div>
                </div>
                <div className="bg-background-light p-sm rounded-lg">
                  <div className="text-lg font-semibold text-primary">5MB</div>
                  <div className="text-xs text-secondary">Max Size</div>
                </div>
                <div className="bg-background-light p-sm rounded-lg">
                  <div className="text-lg font-semibold text-primary">Auto</div>
                  <div className="text-xs text-secondary">Validation</div>
                </div>
              </div>

              {/* Import Features */}
              <div className="grid grid-cols-1 gap-sm text-sm">
                <div className="flex items-center gap-sm text-secondary">
                  <Icon name="check" size={14} className="text-green-600" />
                  <span>Automatic date format detection</span>
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <Icon name="check" size={14} className="text-green-600" />
                  <span>Smart status mapping</span>
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <Icon name="check" size={14} className="text-green-600" />
                  <span>Visa sponsorship detection</span>
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <Icon name="check" size={14} className="text-green-600" />
                  <span>Row-by-row error reporting</span>
                </div>
              </div>

              <p className="text-secondary text-sm">
                Upload a CSV file to bulk import application data. The system automatically validates and normalizes your data.
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
                className="btn btn-secondary btn-block"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary border-t-transparent mr-2" />
                    Importing Data...
                  </>
                ) : (
                  <>
                    <Icon name="add" size={16} />
                    Choose CSV File to Import
                  </>
                )}
              </button>

              {importProgress && (
                <div className="mt-lg space-y-md">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <Icon name="settings" size={16} className="text-primary-orange animate-spin" />
                      <span className="font-medium text-primary">Processing Import</span>
                    </div>
                    <span className="text-lg font-semibold text-primary">
                      {Math.round((importProgress.loaded / importProgress.total) * 100)}%
                    </span>
                  </div>

                  {/* Phase Indicator */}
                  <div className="flex items-center gap-sm text-sm">
                    <div className={`w-2 h-2 rounded-full ${importProgress.rowsProcessed > 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <span className="text-secondary">
                      {importProgress.rowsProcessed === 0 ? 'Reading file...' :
                       importProgress.rowsProcessed < importProgress.total ? 'Validating data...' :
                       'Saving to database...'}
                    </span>
                  </div>

                  {/* Main Progress Bar */}
                  <div className="space-y-sm">
                    <div className="flex justify-between text-sm text-secondary">
                      <span>File Processing</span>
                      <span>{importProgress.loaded} / {importProgress.total} bytes</span>
                    </div>
                    <div className="w-full bg-background-light rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-orange to-primary-orange-light h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(importProgress.loaded / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Detailed Progress Info */}
                  <div className="grid grid-cols-2 gap-md text-sm">
                    <div className="flex items-center gap-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-secondary">Rows Processed:</span>
                      <span className="font-medium text-primary">{importProgress.rowsProcessed}</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <div className={`w-2 h-2 rounded-full ${importProgress.errors > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-secondary">Errors Found:</span>
                      <span className={`font-medium ${importProgress.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {importProgress.errors}
                      </span>
                    </div>
                  </div>

                  {/* Current Operation Details */}
                  <div className="text-xs text-muted bg-background-light p-sm rounded-lg">
                    <div className="flex items-center gap-sm">
                      <Icon name="info" size={12} />
                      <span>
                        {importProgress.rowsProcessed === 0 ? 'Reading and parsing CSV file...' :
                         importProgress.rowsProcessed < importProgress.total ? 'Validating data types and required fields...' :
                         'Saving validated records to database...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demo Data Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-sm">
            <Icon name="settings" size={20} />
            Demo Data Generator
          </h3>
        </div>
        <div className="card-body">
          <p className="text-secondary mb-md">
            Generate 30 realistic sample applications to explore KRISIS features and analytics.
            Includes balanced distribution across different statuses and time periods.
          </p>

          <div className="flex justify-center">
            <DemoDataButton
              onDataGenerated={onDataChange}
              className="max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* File Format Help */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">CSV Format Guide</h3>
        </div>
        <div className="card-body">
          <div className="text-sm text-secondary space-y-sm">
            <p><strong>Exported columns:</strong> Company, Role, Date Applied, Status, Visa Sponsorship, Notes</p>
            <p><strong>Import columns:</strong> company, role, dateApplied, status (required) + visaSponsorship, notes (optional)</p>
            <p><strong>Date formats:</strong> YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</p>
            <p><strong>Status values:</strong> Applied, Phone Screen, Technical Interview, Final Round, Offer, Rejected</p>
            <p><strong>Visa sponsorship:</strong> true/false, yes/no, 1/0</p>
          </div>

          <div className="mt-md p-md bg-background-light rounded-lg">
            <p className="text-sm font-medium text-primary mb-sm">Sample CSV for Import:</p>
            <pre className="text-xs text-secondary overflow-x-auto">
{`company,role,dateApplied,status,visaSponsorship,notes
Google,Software Engineer,2024-01-15,Applied,true,Excited about this role!
Microsoft,Frontend Developer,2024-01-10,Phone Screen,true,Great interview experience
Apple,Data Engineer,2024-01-08,Technical Interview,true,Strong technical team`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataManagement