import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, functions } from '../lib/firebase'
import { getTodayDate } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'
import { extractTextFromPDF } from '../utils/pdfHelpers'
import { httpsCallable } from 'firebase/functions'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { applicationSchema, type ApplicationValues } from '../lib/schemas'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../lib/store'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const statusOptions = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Phone Screen', label: 'Phone Screen' },
  { value: 'Technical Interview', label: 'Technical Interview' },
  { value: 'Final Round', label: 'Final Round' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Rejected', label: 'Rejected' },
]

function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const dispatchNotification = useUIStore((state) => state.dispatchNotification)
  const [user, authLoading] = useAuthState(auth)
  const isNewApplication = id === 'new'

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting: hookIsSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      company: '',
      role: '',
      status: 'Applied',
      dateApplied: getTodayDate(),
      notes: '',
      visaSponsorship: false,
      requestAnalysis: false,
      resumeUrl: '',
      latestAnalysis: undefined,
    },
  })

  const [isLoading, setIsLoading] = useState(id && id !== 'new')
  const [resumeText, setResumeText] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const analysisResult = watch('latestAnalysis')

  const formData = watch()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.')
      return
    }

    try {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
      toast.success('Resume data extracted successfully.')
    } catch {
      toast.error('Failed to parse resume PDF.')
    }
  }

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!resumeText) {
      toast.error('Please upload a PDF resume first.')
      return
    }
    // Require basic context
    if (formData.notes.length < 10 && (!formData.role || !formData.company)) {
      toast.error('Please define a Role and Company, or add details in notes to start analysis.')
      return
    }

    const jobDescription =
      formData.notes.length > 50 ? formData.notes : `Role: ${formData.role} at ${formData.company}.`

    setAnalyzing(true)
    try {
      const analyzeFn = httpsCallable(functions, 'analyzeResume')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await analyzeFn({ resumeText, jobDescription })

      if (result.data.success) {
        const analysisData = {
          ...result.data.data,
          analyzedAt: new Date().toISOString(),
        }
        setValue('latestAnalysis', analysisData, { shouldDirty: true, shouldValidate: true })
        toast.success('Analysis complete. Save changes to persist.')
      } else {
        throw new Error('Analysis returned failure.')
      }
    } catch (error: unknown) {
      console.error('Analysis Error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Analysis failed: ${message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // Load existing application data or handle URL Import
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlFromParams = params.get('importUrl')

    if (id === 'new' && urlFromParams) {
      setImportUrl(urlFromParams)
      handleImport(urlFromParams)
    } else if (id && id !== 'new' && user) {
      loadApplication()
    } else if (id === 'new' || !id) {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  const loadApplication = async () => {
    if (!user || !id) return

    try {
      const docRef = doc(db, `users/${user.uid}/applications/${id}`)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const loadedData: ApplicationValues = {
          company: data.company || '',
          role: data.role || '',
          status: data.status || 'Applied',
          dateApplied: data.dateApplied || getTodayDate(),
          notes: data.notes || '',
          resumeUrl: data.resumeUrl || '',
          visaSponsorship: Boolean(data.visaSponsorship),
          requestAnalysis: false,
          latestAnalysis: data.latestAnalysis,
        }
        reset(loadedData)
      } else {
        dispatchNotification('Application not found', 'error')
        navigate('/applications')
      }
    } catch (error) {
      console.error('Error loading application:', error)
      dispatchNotification(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const onFormSubmit = async (data: ApplicationValues) => {
    if (!user) return

    try {
      // Deep Sanitize: JSON.stringify removes all keys with 'undefined' values automatically
      const sanitizedData = JSON.parse(JSON.stringify(data))

      const applicationData = {
        ...sanitizedData,
        updatedAt: serverTimestamp(),
        ...(isNewApplication && {
          createdAt: serverTimestamp(),
        }),
      }

      if (isNewApplication) {
        const docRef = await addDoc(
          collection(db, `users/${user.uid}/applications`),
          applicationData
        )
        dispatchNotification('Application created successfully.', 'success')
        navigate(`/applications/${docRef.id}`)
      } else {
        await updateDoc(doc(db, `users/${user.uid}/applications/${id}`), applicationData)
        dispatchNotification('Application updated successfully.', 'success')
      }
    } catch (error: unknown) {
      console.error('Error saving application:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      dispatchNotification(`Error saving application: ${errorMessage}`, 'error')
    }
  }

  // Show loading for existing applications that are still loading
  if (id && id !== 'new' && (authLoading || isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">
            {authLoading ? 'Authenticating...' : 'Loading Application...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 font-bold mb-4">
            Please sign in to view this application
          </p>
          <Button onClick={() => navigate('/auth')} variant="primary">
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  // ... existing code ...
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || importUrl
    if (!targetUrl) return

    setIsImporting(true)
    try {
      const ingestFn = httpsCallable(functions, 'ingestJobUrl')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await ingestFn({ url: targetUrl })

      if (result.data.success) {
        const jobData = result.data.data
        setValue('company', jobData.company || '', { shouldDirty: true })
        setValue('role', jobData.role || '', { shouldDirty: true })

        const description = jobData.description
          ? `${jobData.description}\n\nSource: ${targetUrl}`
          : `Source: ${targetUrl}`

        setValue('notes', description, { shouldDirty: true })
        setValue('dateApplied', getTodayDate(), { shouldDirty: true })

        toast.success(`Imported job from ${jobData.company}`)
      }
    } catch (error: unknown) {
      console.error('Import Error:', error)
      toast.error('Failed to import job details. Please fill manually.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="animate-fade-in pb-20 p-6 max-w-4xl mx-auto space-y-6">
      {/* Premium Header */}
      <Card className="py-6 px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/applications"
                className="text-zinc-500 hover:text-primary-600 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
              >
                <Icon name="arrow-left" size={14} />
                Back to Applications
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {isNewApplication ? 'New Application' : 'Application Details'}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isNewApplication && (
              <div className="hidden sm:block">
                <Badge
                  variant={
                    formData.status === 'Offer'
                      ? 'success'
                      : formData.status === 'Rejected'
                        ? 'error'
                        : 'neutral'
                  }
                  className="px-3 py-1 text-sm"
                >
                  {formData.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Import Section (New Only) */}
      {isNewApplication && (
        <Card className="p-6 bg-linear-to-r from-primary-50 to-white dark:from-primary-900/10 dark:to-zinc-900 border-primary-100 dark:border-primary-900/30">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full space-y-2">
              <label
                htmlFor="importUrl"
                className="text-xs font-bold uppercase text-primary-700 dark:text-primary-400 flex items-center gap-2"
              >
                <Icon name="bolt" size={14} />
                Auto-Fill from URL
              </label>
              <input
                id="importUrl"
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste LinkedIn or Indeed URL..."
                className="w-full h-10 px-3 rounded-lg border border-primary-200 dark:border-primary-900/50 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
              />
            </div>
            <Button
              onClick={() => handleImport()}
              disabled={!importUrl || isImporting}
              variant="primary"
              className="w-full md:w-auto"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Importing...
                </>
              ) : (
                'Import Details'
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
          <Card className="p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                <Icon name="work" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Role Information
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Key details about this opportunity
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company */}
              <div className="space-y-1.5">
                <label
                  htmlFor="company"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block"
                >
                  Company Name <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('company')}
                  type="text"
                  id="company"
                  className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm ${errors.company ? 'border-red-500 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-700 focus:border-primary-500'}`}
                  placeholder="e.g. Acme Corp"
                />
                {errors.company && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.company.message}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label
                  htmlFor="role"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block"
                >
                  Role Title <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('role')}
                  type="text"
                  id="role"
                  className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm ${errors.role ? 'border-red-500 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-700 focus:border-primary-500'}`}
                  placeholder="e.g. Senior Engineer"
                />
                {errors.role && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div className="space-y-1.5">
                <label
                  htmlFor="status"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block"
                >
                  Current Status
                </label>
                <div className="relative">
                  <select
                    {...register('status')}
                    id="status"
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm appearance-none cursor-pointer"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="arrow-down"
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Date Applied */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dateApplied"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block"
                >
                  Date Applied <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('dateApplied')}
                  type="date"
                  id="dateApplied"
                  className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm ${errors.dateApplied ? 'border-red-500 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-700 focus:border-primary-500'}`}
                />
                {errors.dateApplied && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    {errors.dateApplied.message}
                  </p>
                )}
              </div>
            </div>

            {/* Visa Sponsorship */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <input
                {...register('visaSponsorship')}
                id="visaSponsorship"
                type="checkbox"
                className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="visaSponsorship" className="cursor-pointer select-none">
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  Visa Sponsorship Required
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Does this company sponsor visas?
                </p>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="notes"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block"
                >
                  Notes / Job Description
                </label>
                <span
                  className={`text-[10px] font-mono ${formData.notes.length > 900 ? 'text-primary-600' : 'text-zinc-400'}`}
                >
                  {formData.notes.length}/1000
                </span>
              </div>
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm min-h-[120px] resize-y ${errors.notes ? 'border-red-500 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-700 focus:border-primary-500'}`}
                placeholder="Paste the job description or add your own notes here..."
              />
              {errors.notes && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.notes.message}</p>
              )}
            </div>

            {/* AI Analysis Checkbox (New Only) */}
            {isNewApplication && (
              <div className="p-4 bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-lg flex items-start gap-3">
                <input
                  {...register('requestAnalysis')}
                  id="requestAnalysis"
                  type="checkbox"
                  className="w-5 h-5 mt-0.5 rounded border-primary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="requestAnalysis" className="cursor-pointer select-none">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="technical" size={14} className="text-primary-600" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      Run AI Analysis
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Automatically analyze this job description against your resume to check for fit
                    and missing keywords.
                  </p>
                </label>
              </div>
            )}

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
              <Button type="button" onClick={() => navigate('/applications')} variant="secondary">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={hookIsSubmitting || !isDirty}
                variant="primary"
                className="w-full sm:w-auto min-w-[140px]"
              >
                {hookIsSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name={isNewApplication ? 'rocket' : 'save'} size={18} />
                    {isNewApplication ? 'Create Application' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>

        {/* AI Analysis Section */}
        {(!isNewApplication || resumeText) && (
          <Card className="mt-8 overflow-hidden p-0">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                  <Icon name="technical" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">AI Resume Analysis</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Insights powered by Gemini
                  </p>
                </div>
              </div>
              {resumeText && !analyzing && !analysisResult && (
                <Button onClick={handleAnalyze} variant="primary" size="sm" className="text-xs">
                  Run Analysis
                </Button>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                  Resume File (PDF)
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <label className="btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white cursor-pointer relative overflow-hidden">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Icon name="upload" size={16} />
                    {resumeText ? 'Replace File' : 'Upload Resume'}
                  </label>
                  {resumeText ? (
                    <div className="flex items-center gap-2 text-primary-600 bg-primary-50 dark:bg-primary-900/10 px-3 py-1.5 rounded-full text-xs font-bold border border-primary-100 dark:border-primary-900/30">
                      <Icon name="check-circle" size={14} />
                      Resume Loaded
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      Upload your resume PDF to enable scoring.
                    </p>
                  )}
                </div>
              </div>

              {/* Analysis State */}
              {analyzing && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-100 border-t-primary-600 mb-4"></div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white animate-pulse">
                    Analyzing...
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Checking your resume against the job description
                  </p>
                </div>
              )}

              {/* Results */}
              {analysisResult && !analyzing && (
                <div className="animate-fade-in space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Score */}
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center text-center group hover:border-primary-500/30 transition-colors">
                      <div
                        className={`text-5xl font-black mb-2 tracking-tighter ${
                          analysisResult.fitScore >= 70
                            ? 'text-green-600'
                            : analysisResult.fitScore >= 40
                              ? 'text-yellow-500'
                              : 'text-red-500'
                        }`}
                      >
                        {analysisResult.fitScore}
                        <span className="text-2xl align-top opacity-50">%</span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Match Score
                      </p>
                      <div
                        className={`absolute bottom-0 left-0 h-1.5 w-full ${
                          analysisResult.fitScore >= 70
                            ? 'bg-green-500'
                            : analysisResult.fitScore >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                    </div>

                    {/* Missing Keywords */}
                    <div className="md:col-span-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2">
                        <Icon name="warning" size={14} className="text-primary-600" />
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.missingKeywords.length > 0 ? (
                          analysisResult.missingKeywords.map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300"
                            >
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-primary-600 font-medium">
                            Perfect match! No key words missing.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                        Analysis
                      </h4>
                      <p className="text-sm text-zinc-900 dark:text-white leading-relaxed">
                        {analysisResult.matchAnalysis}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                        Targeted Improvements
                      </h4>
                      <ul className="space-y-3">
                        {analysisResult.suggestedImprovements.map((tip: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex gap-3 text-sm text-zinc-900 dark:text-white"
                          >
                            <div className="mt-1 shrink-0 text-primary-600">
                              <Icon name="bolt" size={14} />
                            </div>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ApplicationDetail
