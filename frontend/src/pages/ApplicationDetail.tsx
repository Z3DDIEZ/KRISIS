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

  // Load existing application data
  useEffect(() => {
    if (id && id !== 'new' && user) {
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
          <p className="text-text-secondary text-sm font-bold">
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
          <p className="text-text-secondary font-bold mb-4">
            Please sign in to view this application
          </p>
          <Link to="/auth" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in min-h-screen bg-bg-subtle pb-20 p-6">
      {/* Premium Header */}
      <div className="premium-card py-6 px-8 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/applications"
                className="text-text-secondary hover:text-primary-600 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
              >
                <Icon name="arrow-left" size={14} />
                Back to Applications
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {isNewApplication ? 'New Application' : 'Application Details'}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isNewApplication && (
              <div className="hidden sm:block">
                <span
                  className={`badge-pill ${
                    formData.status === 'Offer'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : formData.status === 'Rejected'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formData.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
          <div className="premium-card p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-lg bg-primary-600/10 text-primary-600 flex items-center justify-center">
                <Icon name="work" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Role Information</h3>
                <p className="text-xs text-text-secondary">Key details about this opportunity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company */}
              <div className="space-y-1.5">
                <label
                  htmlFor="company"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wider block"
                >
                  Company Name <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('company')}
                  type="text"
                  id="company"
                  className={`input-modern ${errors.company ? 'border-error ring-error/20' : ''}`}
                  placeholder="e.g. Acme Corp"
                />
                {errors.company && (
                  <p className="text-xs text-error font-medium mt-1">{errors.company.message}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label
                  htmlFor="role"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wider block"
                >
                  Role Title <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('role')}
                  type="text"
                  id="role"
                  className={`input-modern ${errors.role ? 'border-error ring-error/20' : ''}`}
                  placeholder="e.g. Senior Engineer"
                />
                {errors.role && (
                  <p className="text-xs text-error font-medium mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div className="space-y-1.5">
                <label
                  htmlFor="status"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wider block"
                >
                  Current Status
                </label>
                <div className="relative">
                  <select
                    {...register('status')}
                    id="status"
                    className="input-modern appearance-none cursor-pointer"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                </div>
              </div>

              {/* Date Applied */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dateApplied"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wider block"
                >
                  Date Applied <span className="text-primary-600">*</span>
                </label>
                <input
                  {...register('dateApplied')}
                  type="date"
                  id="dateApplied"
                  className={`input-modern ${errors.dateApplied ? 'border-error ring-error/20' : ''}`}
                />
                {errors.dateApplied && (
                  <p className="text-xs text-error font-medium mt-1">
                    {errors.dateApplied.message}
                  </p>
                )}
              </div>
            </div>

            {/* Visa Sponsorship */}
            <div className="p-4 bg-bg-subtle rounded-lg border border-border-subtle flex items-center gap-3">
              <input
                {...register('visaSponsorship')}
                id="visaSponsorship"
                type="checkbox"
                className="w-5 h-5 rounded border-border-strong text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="visaSponsorship" className="cursor-pointer select-none">
                <span className="text-sm font-bold text-text-primary block">
                  Visa Sponsorship Required
                </span>
                <p className="text-xs text-text-muted">Does this company sponsor visas?</p>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="notes"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wider block"
                >
                  Notes / Job Description
                </label>
                <span
                  className={`text-[10px] font-mono ${formData.notes.length > 900 ? 'text-primary-600' : 'text-text-muted'}`}
                >
                  {formData.notes.length}/1000
                </span>
              </div>
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                className={`input-modern min-h-[120px] resize-y ${errors.notes ? 'border-error ring-error/20' : ''}`}
                placeholder="Paste the job description or add your own notes here..."
              />
              {errors.notes && (
                <p className="text-xs text-error font-medium mt-1">{errors.notes.message}</p>
              )}
            </div>

            {/* AI Analysis Checkbox (New Only) */}
            {isNewApplication && (
              <div className="p-4 bg-linear-to-r from-primary-50 to-transparent border border-primary-100 rounded-lg flex items-start gap-3">
                <input
                  {...register('requestAnalysis')}
                  id="requestAnalysis"
                  type="checkbox"
                  className="w-5 h-5 mt-0.5 rounded border-primary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="requestAnalysis" className="cursor-pointer select-none">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="technical" size={14} className="text-primary-600" />
                    <span className="text-sm font-bold text-text-primary">Run AI Analysis</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Automatically analyze this job description against your resume to check for fit
                    and missing keywords.
                  </p>
                </label>
              </div>
            )}

            <div className="pt-6 border-t border-border-subtle flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/applications')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={hookIsSubmitting || !isDirty}
                className="btn-primary w-full sm:w-auto"
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
              </button>
            </div>
          </div>
        </form>

        {/* AI Analysis Section */}
        {(!isNewApplication || resumeText) && (
          <div className="premium-card mt-8 overflow-hidden">
            <div className="p-4 border-b border-border-subtle bg-bg-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                  <Icon name="technical" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">AI Resume Analysis</h3>
                  <p className="text-xs text-text-secondary">Insights powered by Gemini</p>
                </div>
              </div>
              {resumeText && !analyzing && !analysisResult && (
                <button onClick={handleAnalyze} className="btn-primary py-1.5 text-xs">
                  Run Analysis
                </button>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                  Resume File (PDF)
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <label className="btn-secondary cursor-pointer relative overflow-hidden">
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
                    <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full text-xs font-bold border border-primary-100">
                      <Icon name="check-circle" size={14} />
                      Resume Loaded
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">
                      Upload your resume PDF to enable scoring.
                    </p>
                  )}
                </div>
              </div>

              {/* Analysis State */}
              {analyzing && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-100 border-t-primary-600 mb-4"></div>
                  <p className="text-sm font-bold text-text-primary animate-pulse">Analyzing...</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Checking your resume against the job description
                  </p>
                </div>
              )}

              {/* Results */}
              {analysisResult && !analyzing && (
                <div className="animate-fade-in space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Score */}
                    <div className="relative overflow-hidden rounded-xl bg-bg-surface border border-border p-6 flex flex-col items-center justify-center text-center group hover:border-primary-500/30 transition-colors">
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
                      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
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
                    <div className="md:col-span-2 rounded-xl bg-bg-subtle border border-border p-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
                        <Icon name="warning" size={14} className="text-primary-600" />
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.missingKeywords.length > 0 ? (
                          analysisResult.missingKeywords.map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-bg-surface border border-border-strong rounded-md text-xs font-medium text-text-secondary"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border-subtle">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                        Analysis
                      </h4>
                      <p className="text-sm text-text-primary leading-relaxed">
                        {analysisResult.matchAnalysis}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                        Targeted Improvements
                      </h4>
                      <ul className="space-y-3">
                        {analysisResult.suggestedImprovements.map((tip: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm text-text-primary">
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
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicationDetail
