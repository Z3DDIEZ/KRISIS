import { useEffect, useState, useCallback } from 'react'
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
import { motion, type Transition } from 'framer-motion'
import DecryptedText from '../components/effects/DecryptedText'
import SplitText from '../components/effects/SplitText'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

interface AnalysisData {
  fitScore: number
  matchAnalysis: string
  keyMatches: string[]
  missingKeywords: string[]
  suggestedImprovements: string[]
  analyzedAt?: string
}

interface IngestData {
  company?: string
  role?: string
  description?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 } as Transition,
  },
}

const statusOptions = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Phone Screen', label: 'Phone Screen' },
  { value: 'Technical Interview', label: 'Technical Interview' },
  { value: 'Final Round', label: 'Final Round' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Rejected', label: 'Rejected' },
]

/**
 * ApplicationDetail page for creating or editing a single application dossier.
 * @returns The application detail view.
 */
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
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

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
    if (formData.notes.length < 10 && (!formData.role || !formData.company)) {
      toast.error('Please define a Role and Company, or add details in notes to start analysis.')
      return
    }

    const jobDescription =
      formData.notes.length > 50 ? formData.notes : `Role: ${formData.role} at ${formData.company}.`

    setAnalyzing(true)
    try {
      const analyzeFn = httpsCallable<
        { resumeText: string; jobDescription: string },
        { success: boolean; data: AnalysisData }
      >(functions, 'analyzeResume')
      const result = await analyzeFn({ resumeText, jobDescription })

      if (result.data.success) {
        const analysisData = {
          ...(result.data.data as AnalysisData),
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

  const loadApplication = useCallback(async () => {
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
  }, [user, id, reset, navigate, dispatchNotification, t])

  const onFormSubmit = async (data: ApplicationValues) => {
    if (!user) return

    try {
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

  const handleImport = useCallback(
    async (overrideUrl?: string) => {
      const targetUrl = overrideUrl || importUrl
      if (!targetUrl) return

      setIsImporting(true)
      try {
        const ingestFn = httpsCallable<{ url: string }, { success: boolean; data: IngestData }>(
          functions,
          'ingestJobUrl'
        )
        const result = await ingestFn({ url: targetUrl })

        if (result.data.success) {
          const jobData = result.data.data as IngestData
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
    },
    [importUrl, setValue]
  )

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
  }, [user, id, handleImport, loadApplication])

  if (id && id !== 'new' && (authLoading || isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          <p className="text-text-muted text-sm font-medium animate-pulse">
            {authLoading ? 'Authenticating...' : 'Loading Dossier...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center p-8 border border-border bg-bg-surface rounded-xl">
          <p className="text-text-primary font-semibold mb-6">
            Authentication Required for Dossier Access
          </p>
          <Button onClick={() => navigate('/auth')} variant="primary" size="lg">
            Return to Core
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pb-16 px-6 sm:px-8 pt-6 max-w-6xl mx-auto space-y-8 relative"
    >
      {/* Strategic Header */}
      <motion.div variants={itemVariants}>
        <Card className="p-0 overflow-hidden relative">
          <div className="absolute top-4 right-4 bg-bg-subtle text-text-muted text-xs font-semibold px-3 py-1 rounded-full border border-border z-20">
            Internal Use Only
          </div>

          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-8 md:p-12 flex-1 bg-bg-surface text-text-primary">
              <div className="flex items-center gap-2 mb-6">
                <Link
                  to="/applications"
                  className="text-text-muted hover:text-primary-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Icon name="arrow-left" size={14} />
                  Return to Archive
                </Link>
                <div className="h-4 w-px bg-border" />
                <span className="text-text-muted font-mono text-xs">
                  REF: KRISIS-DOSSIER-{id?.toUpperCase().slice(0, 8)}
                </span>
              </div>

              <h1 className="heading-xl text-text-primary mb-4">
                <SplitText
                  text={isNewApplication ? 'New Extractions' : formData.company || 'Target Details'}
                  className="inline"
                />
              </h1>
              {formData.role && (
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary-500" />
                  <p className="text-text-secondary text-sm font-semibold">
                    Operational role: {formData.role}
                  </p>
                </div>
              )}
            </div>

            {!isNewApplication && (
              <div className="md:w-80 bg-bg-subtle p-8 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary-500/40" />
                <span className="text-xs font-semibold text-text-muted mb-6 border-b border-border pb-2">
                  Engagement Phase
                </span>
                <Badge
                  variant={
                    formData.status === 'Offer'
                      ? 'success'
                      : formData.status === 'Rejected'
                        ? 'error'
                        : 'neutral'
                  }
                  className="px-6 py-2 text-sm"
                >
                  {formData.status}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Automated Ingestion Phase (New Only) */}
      {isNewApplication && (
        <motion.div variants={itemVariants}>
          <Card className="p-8 bg-bg-surface border border-border">
            <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
              <div className="flex-1 w-full space-y-3">
                <label
                  htmlFor="importUrl"
                  className="text-sm font-semibold text-text-secondary flex items-center gap-2"
                >
                  <Icon name="bolt" size={14} className="animate-pulse" />
                  Automated Ingestion Protocol
                </label>
                <input
                  id="importUrl"
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="SOURCE URL (LINKEDIN, INDEED, ETC)..."
                  className="w-full h-12 px-4 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <Button
                onClick={() => handleImport()}
                disabled={!importUrl || isImporting}
                variant="primary"
                size="lg"
                className="w-full lg:w-auto px-10"
              >
                {isImporting ? 'INGESTING...' : 'INITIATE INGEST'}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-12">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-12">
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden">
              <div className="bg-bg-subtle px-8 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-bg-elevated text-primary-600 flex items-center justify-center border border-border">
                    <Icon name="work" size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Section 01 // Operational Context
                  </h3>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-2 h-2 bg-border" />
                  ))}
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label
                      htmlFor="company"
                      className="text-xs font-semibold text-text-muted flex justify-between"
                    >
                      Target Entity <span className="text-primary-600">*</span>
                    </label>
                    <input
                      {...register('company')}
                      type="text"
                      className={`w-full h-12 px-4 rounded-lg border bg-bg-surface text-text-primary outline-none transition-all focus:ring-2 focus:ring-primary-500/20 ${errors.company ? 'border-error' : 'border-border focus:border-primary-500'}`}
                      placeholder="Acme Corp / Global Sec"
                    />
                  </div>

                  <div className="space-y-3">
                    <label
                      htmlFor="role"
                      className="text-xs font-semibold text-text-muted flex justify-between"
                    >
                      Designated Role <span className="text-primary-600">*</span>
                    </label>
                    <input
                      {...register('role')}
                      type="text"
                      className={`w-full h-12 px-4 rounded-lg border bg-bg-surface text-text-primary outline-none transition-all focus:ring-2 focus:ring-primary-500/20 ${errors.role ? 'border-error' : 'border-border focus:border-primary-500'}`}
                      placeholder="Principal Engineer / Lead"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label htmlFor="status" className="text-xs font-semibold text-text-muted">
                      Engagement Phase
                    </label>
                    <div className="relative">
                      <select
                        {...register('status')}
                        className="w-full h-12 px-4 rounded-lg border border-border bg-bg-surface text-text-primary outline-none focus:border-primary-500 transition-all text-sm appearance-none cursor-pointer"
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="dateApplied" className="text-xs font-semibold text-text-muted">
                      Timestamp: Initial Contact <span className="text-primary-600">*</span>
                    </label>
                    <input
                      {...register('dateApplied')}
                      type="date"
                      className="w-full h-12 px-4 rounded-lg border border-border bg-bg-surface text-text-primary outline-none focus:border-primary-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="p-6 bg-bg-subtle border border-border rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-text-primary block">
                      Authorisation Status
                    </span>
                    <p className="text-xs text-text-muted">
                      International visa sponsorship assessment required.
                    </p>
                  </div>
                  <input
                    {...register('visaSponsorship')}
                    type="checkbox"
                    className="w-6 h-6 rounded border-border text-primary-600 focus:ring-primary-500/20 cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="notes"
                    className="text-xs font-semibold text-text-muted flex justify-between"
                  >
                    Strategic Intelligence / Match Assessment Details
                    <span className="font-mono text-xs text-text-muted">
                      {formData.notes.length}/1000
                    </span>
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={8}
                    className="w-full p-4 rounded-lg border border-border bg-bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-sm leading-relaxed placeholder:text-text-muted"
                    placeholder="Enter full job specifications, requirements, and tactical field notes..."
                  />
                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${isDirty ? 'bg-error animate-pulse' : 'bg-success'}`}
                    />
                    <span className="text-xs font-semibold text-text-muted">
                      Status: {isDirty ? 'Unsaved changes' : 'All changes saved'}
                    </span>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button
                      type="button"
                      onClick={() => navigate('/applications')}
                      variant="secondary"
                      size="lg"
                      className="flex-1 md:flex-none px-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={hookIsSubmitting || !isDirty}
                      variant="primary"
                      size="lg"
                      className="flex-1 md:flex-none px-10"
                    >
                      {hookIsSubmitting
                        ? 'Saving...'
                        : isNewApplication
                          ? 'Submit Dossier'
                          : 'Update Dossier'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </form>

        {/* Strategic Analysis Dossier Section */}
        {!isNewApplication && formData.latestAnalysis && (
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden">
              <div className="bg-bg-subtle px-8 py-4 border-b border-border flex items-center justify-between">
                <hgroup>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Section 02 // Strategic Intelligence Assessment
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    System Timestamp:{' '}
                    {formData.latestAnalysis.analyzedAt?.slice(0, 16).replace('T', ' ')}
                  </p>
                </hgroup>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-1.5 h-6 bg-border" />
                  ))}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-96 p-10 flex flex-col items-center justify-center bg-bg-surface border-b lg:border-b-0 lg:border-r border-border relative overflow-hidden group">
                  <motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-[4px] bg-primary-500/20 z-10 pointer-events-none"
                  />

                  <span className="text-xs font-semibold text-text-muted mb-6">
                    Strategic Match Signal
                  </span>
                  <div className="relative">
                    <span className="text-6xl sm:text-7xl font-semibold tracking-tight text-primary-600 tabular-nums leading-none">
                      {formData.latestAnalysis.fitScore}
                    </span>
                    <span className="absolute -top-4 -right-6 text-2xl font-semibold text-primary-400">
                      %
                    </span>
                  </div>

                  <div className="mt-6 w-full bg-bg-subtle h-2 rounded-full overflow-hidden border border-border p-px">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${formData.latestAnalysis.fitScore}%` }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                      className="h-full bg-primary-500"
                    />
                  </div>

                  <p className="mt-6 text-xs text-center leading-relaxed text-text-muted bg-bg-subtle p-4 border border-border rounded-lg w-full">
                    Vector alignment analysis:
                    <span className="text-primary-600 font-semibold mt-2 block text-base">
                      {formData.latestAnalysis.fitScore >= 80
                        ? 'Critical match'
                        : formData.latestAnalysis.fitScore >= 60
                          ? 'High alignment'
                          : 'Marginal signal'}
                    </span>
                  </p>
                </div>

                <div className="flex-1 p-8 md:p-12 space-y-10 bg-bg-surface">
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary-500 animate-ping" />
                      Intelligence Summary
                    </h4>
                    <div className="text-sm text-text-secondary leading-relaxed font-mono bg-bg-subtle p-4 border border-border rounded-lg">
                      <DecryptedText
                        text={
                          formData.latestAnalysis.matchAnalysis || 'NO_INTELLIGENCE_DATA_RETRIEVED'
                        }
                        speed={40}
                        maxIterations={20}
                        className="inline"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h4 className="text-xs font-semibold text-text-muted border-b border-border pb-2">
                        Verified Skill Assets
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {formData.latestAnalysis.keyMatches?.map((skill: string, index: number) => (
                          <Badge key={index} variant="success" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xs font-semibold text-text-muted border-b border-border pb-2">
                        Identified Skill Deficiencies
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {formData.latestAnalysis.missingKeywords?.map(
                          (skill: string, index: number) => (
                            <Badge key={index} variant="warning" className="text-xs">
                              {skill}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {formData.latestAnalysis.suggestedImprovements &&
                    formData.latestAnalysis.suggestedImprovements.length > 0 && (
                      <div className="p-6 bg-bg-subtle text-text-primary border-l-4 border-primary-500 rounded-lg">
                        <h4 className="text-sm font-semibold mb-4 flex items-center gap-3">
                          <Icon name="bolt" size={16} />
                          Operational Recommendations
                        </h4>
                        <ul className="space-y-4">
                          {formData.latestAnalysis.suggestedImprovements.map(
                            (tip: string, index: number) => (
                              <li key={index} className="flex items-start gap-4">
                                <div className="mt-2 w-2 h-2 bg-primary-500 rounded-full shrink-0" />
                                <span className="text-sm leading-tight text-text-secondary">
                                  {tip}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Manual Trigger / Resource Management */}
        {!isNewApplication && (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4"
          >
            {/* Analysis Trigger if missing */}
            {!formData.latestAnalysis && resumeText && (
              <Card className="p-10 border border-dashed border-border bg-bg-subtle flex flex-col items-center text-center group hover:bg-bg-surface transition-all">
                <div className="w-16 h-16 bg-bg-elevated text-primary-600 flex items-center justify-center mb-6 border border-border rounded-xl group-hover:scale-110 transition-transform">
                  <Icon name="technical" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Intelligence Gap Detected
                </h3>
                <p className="text-sm text-text-muted max-w-xs mb-10 leading-relaxed">
                  CV data available but no strategic assessment performed. Initiate technical
                  alignment protocol now.
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  {analyzing ? 'Processing...' : 'Execute Analysis'}
                </Button>
              </Card>
            )}

            {/* CV Management */}
            <Card className="p-8 border border-border bg-bg-surface flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-text-muted mb-2">Resource Protocol</h4>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-bg-elevated text-primary-600 rounded-lg border border-border">
                    <Icon name="upload" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Pilot Profile (CV/Resume)
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Format: PDF only, access restricted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                {resumeText && (
                  <div className="flex items-center gap-2 p-3 bg-bg-subtle border border-border mb-2 text-xs font-semibold text-success">
                    <Icon name="check-circle" size={14} />
                    Data Synchronized: {resumeText.length} bytes extracted
                  </div>
                )}
                <label className="h-12 px-6 border border-border bg-bg-surface text-text-primary flex items-center justify-center font-semibold text-sm rounded-lg cursor-pointer hover:bg-bg-subtle transition-all">
                  {resumeText ? 'Re-upload Source' : 'Upload Source File'}
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default ApplicationDetail
