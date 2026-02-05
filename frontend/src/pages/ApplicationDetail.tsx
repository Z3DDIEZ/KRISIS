import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore'
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
  { value: 'Rejected', label: 'Rejected' }
]

function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const dispatchNotification = useUIStore(state => state.dispatchNotification)
  const [user, authLoading] = useAuthState(auth)
  const isNewApplication = id === 'new'

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting: hookIsSubmitting }
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
      latestAnalysis: undefined
    }
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
      toast.error('Tactical Error: Only PDF files are supported.')
      return
    }

    try {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
      toast.success('Resume data extracted successfully.')
    } catch (error) {
      toast.error('Failed to parse resume PDF.')
    }
  }

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!resumeText) {
      toast.error('Missing Resume: Upload a PDF first.')
      return
    }
    // For now we use the 'notes' field as Job Description if Role is vague, 
    // but ideally we'd have a separate JD field. 
    // Let's assume the user puts the JD in "Notes" for now or we prompt them.
    // Actually, let's use the Role + Company as a minimal JD if Notes is short.
    const jobDescription = formData.notes.length > 50
      ? formData.notes
      : `Role: ${formData.role} at ${formData.company}.`

    setAnalyzing(true)
    try {
      const analyzeFn = httpsCallable(functions, 'analyzeResume')
      const result: any = await analyzeFn({ resumeText, jobDescription })

      if (result.data.success) {
        const analysisData = {
          ...result.data.data,
          analyzedAt: new Date().toISOString()
        }
        setValue('latestAnalysis', analysisData, { shouldDirty: true, shouldValidate: true })
        toast.success('Analysis complete. Sync Intel to save.')
      } else {
        throw new Error('Analysis returned failure.')
      }
    } catch (error: any) {
      console.error("Analysis Error:", error)
      toast.error(`Analysis failed: ${error.message}`)
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
          latestAnalysis: data.latestAnalysis
        }
        reset(loadedData)
      } else {
        dispatchNotification('Application protocol mission: MISSING', 'error')
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
      const applicationData = {
        ...data,
        updatedAt: serverTimestamp(),
        ...(isNewApplication && {
          createdAt: serverTimestamp()
        })
      }

      if (isNewApplication) {
        const docRef = await addDoc(
          collection(db, `users/${user.uid}/applications`),
          applicationData
        )
        dispatchNotification('Application localized and registered.', 'success')
        navigate(`/applications/${docRef.id}`)
      } else {
        await updateDoc(
          doc(db, `users/${user.uid}/applications/${id}`),
          applicationData
        )
        dispatchNotification('Intelligence node updated.', 'success')
      }
    } catch (error: unknown) {
      console.error('Error saving application:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      dispatchNotification(`Tactical failure: ${errorMessage}`, 'error')
    }
  }

  // Show loading for existing applications that are still loading
  if (id && id !== 'new' && (authLoading || isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
        <p className="mt-4 text-secondary uppercase text-xs tracking-widest font-bold">
          {authLoading ? 'Authenticating Signal...' : 'Decrypting Data...'}
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted uppercase text-xs tracking-widest font-black">Access Denied: Please Initiate Session</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary mb-sm uppercase tracking-tighter">
          {isNewApplication ? t('common.execute') + ': New Pipeline Node' : 'Intelligence Protocol: Update'}
        </h1>
        <p className="text-secondary text-base font-medium opacity-80 uppercase text-[10px] tracking-widest">
          {isNewApplication
            ? 'Quantifying a new market engagement node'
            : 'Synchronizing intelligence parameters'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="card shadow-2xl border-l-[6px] border-l-primary-orange">
        <div className="card-body p-spacing-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            {/* Company */}
            <div className="input-group">
              <label htmlFor="company" className="input-label font-black text-[10px] uppercase tracking-widest text-muted mb-2 block">
                Target Entity <span className="text-primary-orange">*</span>
              </label>
              <input
                {...register('company')}
                type="text"
                id="company"
                className={`input-field bg-surface-2 border-border-light focus:border-primary-orange rounded-none h-12 px-4 transition-all ${errors.company ? 'border-red-500' : ''}`}
                placeholder="e.g., Google, Microsoft"
              />
              {errors.company && (
                <p className="text-[10px] uppercase font-bold text-red-500 mt-2 tracking-wide">{errors.company.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="input-group">
              <label htmlFor="role" className="input-label font-black text-[10px] uppercase tracking-widest text-muted mb-2 block">
                Designated Role <span className="text-primary-orange">*</span>
              </label>
              <input
                {...register('role')}
                type="text"
                id="role"
                className={`input-field bg-surface-2 border-border-light focus:border-primary-orange rounded-none h-12 px-4 transition-all ${errors.role ? 'border-red-500' : ''}`}
                placeholder="e.g., Software Engineer"
              />
              {errors.role && (
                <p className="text-[10px] uppercase font-bold text-red-500 mt-2 tracking-wide">{errors.role.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            {/* Status */}
            <div className="input-group">
              <label htmlFor="status" className="input-label font-black text-[10px] uppercase tracking-widest text-muted mb-2 block">
                Pipeline Phase
              </label>
              <select
                {...register('status')}
                id="status"
                className="select-field bg-surface-2 border-border-light focus:border-primary-orange rounded-none h-12 px-4 appearance-none font-bold uppercase text-xs"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Applied */}
            <div className="input-group">
              <label htmlFor="dateApplied" className="input-label font-black text-[10px] uppercase tracking-widest text-muted mb-2 block">
                Submission Timestamp <span className="text-primary-orange">*</span>
              </label>
              <input
                {...register('dateApplied')}
                type="date"
                id="dateApplied"
                className={`input-field bg-surface-2 border-border-light focus:border-primary-orange rounded-none h-12 px-4 transition-all ${errors.dateApplied ? 'border-red-500' : ''}`}
              />
              {errors.dateApplied && (
                <p className="text-[10px] uppercase font-bold text-red-500 mt-2 tracking-wide">{errors.dateApplied.message}</p>
              )}
            </div>
          </div>

          {/* Visa Sponsorship */}
          <div className="input-group mb-lg">
            <div className="flex items-center gap-sm">
              <div className="relative">
                <input
                  {...register('visaSponsorship')}
                  id="visaSponsorship"
                  type="checkbox"
                  className="w-5 h-5 accent-primary-orange bg-surface-3 border-border rounded-none cursor-pointer"
                />
              </div>
              <label htmlFor="visaSponsorship" className="text-[10px] uppercase font-black tracking-widest text-secondary cursor-pointer select-none">
                Residency Protocol: Required Support
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="input-group mb-lg">
            <label htmlFor="notes" className="input-label font-black text-[10px] uppercase tracking-widest text-muted mb-2 block">
              Intelligence Context
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={4}
              className={`textarea-field bg-surface-2 border-border-light focus:border-primary-orange rounded-none px-4 py-3 transition-all ${errors.notes ? 'border-red-500' : ''}`}
              placeholder="Inject tactical data..."
            />
            <div className="flex justify-between mt-2">
              {errors.notes ? (
                <p className="text-[10px] uppercase font-bold text-red-500 tracking-wide">{errors.notes.message}</p>
              ) : (
                <p className="text-[10px] uppercase font-bold text-muted tracking-widest">Optional Decryption</p>
              )}
              <p className={`text-[10px] font-mono font-bold ${formData.notes.length > 900 ? 'text-primary-orange' : 'text-muted'}`}>
                {formData.notes.length}/1000
              </p>
            </div>
          </div>

          {/* AI Analysis Request */}
          {isNewApplication && (
            <div className="bg-surface-3 border border-border-light p-spacing-4 mb-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-orange" />
              <div className="flex items-start gap-sm">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    {...register('requestAnalysis')}
                    id="requestAnalysis"
                    type="checkbox"
                    className="w-5 h-5 accent-primary-orange cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="requestAnalysis" className="text-xs font-black uppercase tracking-widest text-primary-orange flex items-center gap-2">
                    <Icon name="technical" size={14} />
                    Gemini Intelligence Protocol
                  </label>
                  <p className="text-[10px] text-secondary font-medium uppercase mt-1 opacity-70 leading-relaxed tracking-wider">
                    Engage neural networks to quantify resume-job fit architecture.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="card-footer flex justify-end gap-spacing-3 pt-spacing-4 border-t border-border-light mt-spacing-4">
            <button
              type="submit"
              disabled={hookIsSubmitting || !isDirty}
              className="btn btn-primary px-10 h-12 rounded-none font-black uppercase text-[10px] tracking-[0.2em] bg-primary-orange text-white hover:brightness-110 disabled:grayscale disabled:opacity-50 transition-all shadow-lg"
            >
              {hookIsSubmitting ? t('common.loading') : (isNewApplication ? 'Deploy Node' : 'Sync Intel')}
            </button>
          </div>
        </div>
      </form>

      {/* AI Analysis Section (Only for existing applications or if resume is added) */}
      <div className="card mt-xl border border-border-light shadow-lg animate-fade-in delay-100">
        <div className="card-header border-b border-border-light bg-surface-2/50 flex justify-between items-center">
          <h3 className="card-title flex items-center gap-2 text-primary">
            <Icon name="technical" size={20} className="text-primary-orange" />
            Resume Compatibility Analysis
          </h3>
          {resumeText && !analyzing && !analysisResult && (
            <button
              onClick={handleAnalyze}
              className="btn btn--sm btn--orange font-black uppercase tracking-widest text-[10px]"
            >
              Run Analysis
            </button>
          )}
        </div>
        <div className="card-body p-spacing-6">
          {/* File Upload Area */}
          <div className="mb-lg">
            <label className="block text-xs font-black uppercase tracking-widest text-muted mb-3">
              Resume Source File (PDF Only)
            </label>
            <div className="flex items-center gap-4">
              <label className="btn btn--secondary cursor-pointer relative overflow-hidden">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="flex items-center gap-2">
                  <Icon name="upload" size={16} />
                  {resumeText ? 'Replace File' : 'Upload Resume'}
                </span>
              </label>
              {resumeText && (
                <div className="flex items-center gap-2 text-primary-green">
                  <Icon name="check_circle" size={16} />
                  <span className="text-xs font-bold uppercase">Resume Parsed Successfully</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-secondary mt-2 opacity-70">
              Upload your resume to unlock AI-driven compatibility scoring and improvement suggestions.
            </p>
          </div>

          {/* Analysis Loading State */}
          {analyzing && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-orange mb-4"></div>
              <p className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">Running Neural Diagnostics...</p>
              <p className="text-[10px] text-muted mt-2">Comparing skillset vectors against role requirements</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && !analyzing && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Score Card */}
                <div className="p-6 bg-surface-2 rounded-xl border border-border-light flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className={`text-5xl font-black mb-2 ${analysisResult.fitScore >= 70 ? 'text-primary-green' : analysisResult.fitScore >= 40 ? 'text-yellow-500' : 'text-primary-red'}`}>
                    {analysisResult.fitScore}%
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Compatibility Score</div>
                  <div className={`absolute bottom-0 left-0 h-1 w-full ${analysisResult.fitScore >= 70 ? 'bg-primary-green' : analysisResult.fitScore >= 40 ? 'bg-yellow-500' : 'bg-primary-red'}`}></div>
                </div>

                {/* Missing Keywords */}
                <div className="md:col-span-2 p-6 bg-surface-2 rounded-xl border border-border-light">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Icon name="warning" size={14} className="text-primary-orange" />
                    Missing Critical Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missingKeywords.length > 0 ? (
                      analysisResult.missingKeywords.map((keyword: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-surface-1 border border-border-light rounded text-xs font-medium text-secondary">
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-secondary italic">No critical keywords missing. Excellent match!</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Analysis Text */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3">Diagnostic Report</h4>
                  <p className="text-sm text-secondary leading-relaxed p-4 bg-surface-2 rounded-lg border border-border-light">
                    {analysisResult.matchAnalysis}
                  </p>
                </div>

                {/* Improvements */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3">Optimization Tactics</h4>
                  <ul className="space-y-2">
                    {analysisResult.suggestedImprovements.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-surface-2 rounded border border-border-light/50">
                        <Icon name="bolt" size={14} className="text-primary-yellow mt-0.5 shrink-0" />
                        <span className="text-xs text-secondary">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApplicationDetail
