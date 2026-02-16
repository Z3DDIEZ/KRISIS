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
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import PageHeader from './ui/PageHeader'
import LoadingSpinner from './ui/LoadingSpinner'
import { Badge } from './ui/Badge'

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

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
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
            ...(data.updatedAt && { updatedAt: data.updatedAt }),
          })
        })
        setApplications(apps)
        setIsLoadingData(false)
      },
      (error) => {
        console.error('Error loading applications:', error)
        toast.error('Failed to load applications')
        setIsLoadingData(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const handleExportCsv = () => {
    const success = exportApplicationsToCsv(applications, {
      filename: `krisis-applications-${new Date().toISOString().split('T')[0]}.csv`,
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
                ...(record.resumeUrl && { resumeUrl: record.resumeUrl }),
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
          toast.warning(
            `${result.errors.length} rows had errors and were skipped. Check console for details.`
          )
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">Please sign in to manage your data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-fade-in pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Data Management"
        description="Import, export, and generate demo data for your application database."
        withGradient={false}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 flex items-center justify-between group hover:shadow-xl transition-all duration-300 border-zinc-200/50 dark:border-zinc-800/50">
          <div>
            <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {applications.length}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">
              Total Intelligence
            </div>
          </div>
          <div className="p-4 bg-primary-50 dark:bg-primary-900/10 text-primary-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Icon name="work" size={28} />
          </div>
        </Card>

        <Card className="p-8 flex items-center justify-between group hover:shadow-xl transition-all duration-300 border-zinc-200/50 dark:border-zinc-800/50">
          <div>
            <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {applications.filter((app) => app.status === 'Offer').length}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">
              Offer Conversion
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Icon name="check-circle" size={28} />
          </div>
        </Card>

        <Card className="p-8 flex items-center justify-between group hover:shadow-xl transition-all duration-300 border-zinc-200/50 dark:border-zinc-800/50">
          <div>
            <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {applications.length > 0
                ? Math.round(
                    (applications.filter((app) => app.status === 'Offer').length /
                      applications.length) *
                      100
                  )
                : 0}
              %
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">
              Success Ratio
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Icon name="chart" size={28} />
          </div>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Export Card */}
        <Card className="p-10 flex flex-col border-zinc-200/50 dark:border-zinc-800/50 hover:border-primary-500/20 transition-colors">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-2xl shadow-sm">
              <Icon name="download" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Export Corpus
              </h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                Archive your application intelligence
              </p>
            </div>
          </div>

          <div className="space-y-8 flex-1 flex flex-col">
            {/* Export Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
                <div className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                  {applications.length}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">
                  Records
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
                <div className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">
                  Snap
                </div>
              </div>
            </div>

            {/* Export Details */}
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-3 bg-zinc-50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/30">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                  Format
                </span>
                <span className="font-black text-zinc-900 dark:text-zinc-200">CSV (UTF-8)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                  Scope
                </span>
                <span className="font-black text-zinc-900 dark:text-zinc-200 truncate ml-4">
                  Full Intelligence Database
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                  Status
                </span>
                <Badge variant={applications.length > 0 ? 'success' : 'neutral'}>
                  {applications.length > 0 ? 'Ready' : 'No Data'}
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleExportCsv}
              disabled={applications.length === 0}
              variant="primary"
              className="w-full py-4 mt-auto shadow-xl shadow-primary-500/10"
            >
              <Icon name="download" size={20} />
              Export intelligence.csv
            </Button>
          </div>
        </Card>

        {/* Import Card */}
        <Card className="p-10 flex flex-col border-zinc-200/50 dark:border-zinc-800/50 hover:border-primary-500/20 transition-colors">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-2xl shadow-sm">
              <Icon name="add" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Bulk Ingestion
              </h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                Ingest external application data
              </p>
            </div>
          </div>

          <div className="space-y-8 flex-1 flex flex-col">
            {/* Import Constraints */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 text-center shadow-inner">
                <div className="font-black text-zinc-900 dark:text-white text-sm">CSV</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                  Format
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 text-center shadow-inner">
                <div className="font-black text-zinc-900 dark:text-white text-sm">5MB</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                  Quota
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 text-center shadow-inner">
                <div className="font-black text-zinc-900 dark:text-white text-sm">Batch</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                  Mode
                </div>
              </div>
            </div>

            {/* Import Features */}
            <div className="space-y-3 px-1">
              {[
                'Neural pattern matching for dates',
                'Automatic status reconciliation',
                'Schema validation & deduplication',
              ].map((text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />

            <Button
              onClick={handleFileSelect}
              disabled={isImporting}
              variant="secondary"
              className="w-full py-4 mt-auto border-zinc-200 dark:border-zinc-800"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-3" />
                  Analyzing Buffer...
                </>
              ) : (
                <>
                  <Icon name="upload" size={20} />
                  Ingest Intelligence Source
                </>
              )}
            </Button>

            {importProgress && (
              <div className="mt-4 p-5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 space-y-4 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Ingestion Progress
                  </span>
                  <span className="text-sm font-black text-primary-600">
                    {Math.round((importProgress.loaded / importProgress.total) * 100)}%
                  </span>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden shadow-inner">
                  <div
                    className="bg-primary-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                    style={{ width: `${(importProgress.loaded / importProgress.total) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-lg font-black text-zinc-900 dark:text-white">
                      {importProgress.rowsProcessed}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Success
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-lg font-black ${importProgress.errors > 0 ? 'text-red-500' : 'text-zinc-500'}`}
                    >
                      {importProgress.errors}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Anomalies
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Demo Data Card */}
      <Card className="p-10 relative overflow-hidden group border-zinc-200/50 dark:border-zinc-800/50">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
          <Icon name="settings" size={120} className="text-primary-500" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-2xl shadow-sm">
              <Icon name="bolt" size={24} />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              Intelligence Factory
            </h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-2xl font-medium leading-relaxed">
            Populate your database with 50+ realistic application vectors to stress-test your visual
            intelligence metrics and predictive analytics.
          </p>

          <div className="flex justify-start">
            <DemoDataButton
              onDataGenerated={onDataChange}
              className="w-full sm:w-auto px-10 py-4 shadow-xl shadow-primary-500/10"
            />
          </div>
        </div>
      </Card>

      {/* File Format Help */}
      <Card className="p-10 border-zinc-200/50 dark:border-zinc-800/50">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-8">
          Intelligence Schema Protocol
        </h3>
        <div className="bg-zinc-100/50 dark:bg-zinc-900/80 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 font-mono text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto shadow-inner">
          <div className="mb-4 text-zinc-900 dark:text-zinc-200 font-black tracking-tight">
            System Headers:
          </div>
          <div className="text-blue-600 dark:text-blue-400 font-bold tracking-tight">
            company, role, dateApplied, status, visaSponsorship, notes
          </div>
          <div className="mt-8 mb-4 text-zinc-900 dark:text-zinc-200 font-black tracking-tight">
            Vector Sample:
          </div>
          <div className="text-zinc-400 dark:text-zinc-500 leading-relaxed italic">
            "SpaceX, Mission Operations, 2026-02-15, Interview, true, \"Strategic referral vector\""
          </div>
        </div>
      </Card>
    </div>
  )
}

export default DataManagement
