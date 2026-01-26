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
import { auth, db } from '../lib/firebase'
import { getTodayDate } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'

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
      resumeUrl: ''
    }
  })

  const [isLoading, setIsLoading] = useState(id && id !== 'new')
  const formData = watch()

  // Load existing application data
  useEffect(() => {
    if (id && id !== 'new' && user) {
      loadApplication()
    } else if (id === 'new' || !id) {
      setIsLoading(false)
    }
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
          requestAnalysis: false
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
    } catch (error: any) {
      console.error('Error saving application:', error)
      dispatchNotification(`Tactical failure: ${error.message}`, 'error')
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
              type="button"
              onClick={() => navigate('/applications')}
              className="btn btn-secondary px-8 h-12 rounded-none font-black uppercase text-[10px] tracking-[0.2em]"
            >
              Abort
            </button>
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
    </div>
  )
}

export default ApplicationDetail
