import { useState, useEffect } from 'react'
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
import { validateAndNormalizeDate, getTodayDate, formatDateForDisplay } from '../lib/dateUtils'
import { toast } from 'sonner'

interface ApplicationFormData {
  company: string
  role: string
  status: string
  dateApplied: string
  notes: string
  resumeUrl?: string
  requestAnalysis: boolean
}

interface FormErrors {
  company?: string
  role?: string
  dateApplied?: string
  notes?: string
}

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
  const [user, loading] = useAuthState(auth)
  const isNewApplication = id === 'new'


  const [formData, setFormData] = useState<ApplicationFormData>({
    company: '',
    role: '',
    status: 'Applied',
    dateApplied: getTodayDate(),
    notes: '',
    requestAnalysis: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(id && id !== 'new')
  const [errors, setErrors] = useState<FormErrors>({})
  const [originalData, setOriginalData] = useState<ApplicationFormData | null>(null)

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
        const loadedData = {
          company: data.company || '',
          role: data.role || '',
          status: data.status || 'Applied',
          dateApplied: data.dateApplied || getTodayDate(),
          notes: data.notes || '',
          resumeUrl: data.resumeUrl || '',
          requestAnalysis: false // Reset to false for edits
        }
        setFormData(loadedData)
        setOriginalData(loadedData)
      } else {
        toast.error('Application not found')
        navigate('/applications')
      }
    } catch (error) {
      console.error('Error loading application:', error)
      toast.error('Failed to load application')
    } finally {
      setIsLoading(false)
    }
  }

  const validateField = (field: keyof ApplicationFormData, value: string | boolean | undefined): string | undefined => {
    switch (field) {
      case 'company':
        if (!value || typeof value === 'string' && !value.trim()) {
          return 'Company name is required'
        }
        if (typeof value === 'string' && value.trim().length < 2) {
          return 'Company name must be at least 2 characters'
        }
        if (typeof value === 'string' && value.trim().length > 100) {
          return 'Company name must be less than 100 characters'
        }
        break
      case 'role':
        if (!value || typeof value === 'string' && !value.trim()) {
          return 'Role is required'
        }
        if (typeof value === 'string' && value.trim().length < 2) {
          return 'Role must be at least 2 characters'
        }
        if (typeof value === 'string' && value.trim().length > 100) {
          return 'Role must be less than 100 characters'
        }
        break
      case 'dateApplied':
        if (!value || typeof value === 'string' && !value.trim()) {
          return 'Date applied is required'
        }
        try {
          validateAndNormalizeDate(value as string, false)
        } catch {
          return 'Please enter a valid date'
        }
        break
      case 'notes':
        if (typeof value === 'string' && value.length > 1000) {
          return 'Notes must be less than 1000 characters'
        }
        break
      // resumeUrl and requestAnalysis don't need validation
      case 'resumeUrl':
      case 'requestAnalysis':
        break
    }
    return undefined
  }

  const handleInputChange = (field: keyof ApplicationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Real-time validation
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleDateChange = (dateString: string) => {
    try {
      const normalizedDate = validateAndNormalizeDate(dateString, true)
      setFormData(prev => ({ ...prev, dateApplied: normalizedDate }))
      setErrors(prev => ({ ...prev, dateApplied: undefined }))
    } catch (error) {
      setErrors(prev => ({ ...prev, dateApplied: 'Please enter a valid date' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Only validate fields that can have validation errors
    const fieldsToValidate: (keyof ApplicationFormData)[] = ['company', 'role', 'dateApplied', 'notes']

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field as keyof FormErrors] = error
      }
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors below')
      return false
    }

    return true
  }

  const hasFormChanged = (): boolean => {
    if (!originalData) return true // For new applications, always allow submit

    return (
      formData.company.trim() !== originalData.company.trim() ||
      formData.role.trim() !== originalData.role.trim() ||
      formData.status !== originalData.status ||
      formData.dateApplied !== originalData.dateApplied ||
      formData.notes.trim() !== originalData.notes.trim() ||
      formData.resumeUrl !== originalData.resumeUrl
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !validateForm()) {
      return
    }

    // For existing applications, check if anything actually changed
    if (!isNewApplication && !hasFormChanged()) {
      toast.info('No changes detected')
      return
    }

    setIsSubmitting(true)
    console.log('Starting form submission...')
    try {
      const applicationData = {
        ...formData,
        company: formData.company.trim(),
        role: formData.role.trim(),
        notes: formData.notes.trim(),
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
        toast.success('Application created successfully!')
        navigate(`/applications/${docRef.id}`)
      } else {
        await updateDoc(
          doc(db, `users/${user.uid}/applications/${id}`),
          applicationData
        )
        toast.success('Application updated successfully!')
      }
    } catch (error: any) {
      console.error('Error saving application:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        userId: user?.uid
      })
      toast.error(`Failed to save application: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading for existing applications that are still loading
  if (id && id !== 'new' && (loading || isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">
          {loading ? 'Loading authentication...' : 'Loading application...'}
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage applications.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNewApplication ? 'Add New Application' : 'Edit Application'}
        </h1>
        <p className="text-gray-600">
          {isNewApplication
            ? 'Track a new job application'
            : 'Update your application details'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
              Company *
            </label>
            <input
              type="text"
              id="company"
              required
              maxLength={100}
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.company ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Google, Microsoft"
            />
            {errors.company && (
              <p className="mt-1 text-sm text-red-600">{errors.company}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <input
              type="text"
              id="role"
              required
              maxLength={100}
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.role ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Software Engineer"
            />
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Applied */}
          <div>
            <label htmlFor="dateApplied" className="block text-sm font-medium text-gray-700 mb-2">
              Date Applied *
            </label>
            <input
              type="date"
              id="dateApplied"
              required
              value={formData.dateApplied}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.dateApplied ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateApplied ? (
              <p className="mt-1 text-sm text-red-600">{errors.dateApplied}</p>
            ) : formData.dateApplied ? (
              <p className="mt-1 text-sm text-gray-500">
                {formatDateForDisplay(formData.dateApplied)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            maxLength={1000}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.notes ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
            placeholder="Additional details about this application..."
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.notes ? (
              <p className="text-red-600">{errors.notes}</p>
            ) : (
              <p className="text-gray-500">Optional additional details</p>
            )}
            <p className={`text-gray-500 ${formData.notes.length > 900 ? 'text-orange-600' : ''}`}>
              {formData.notes.length}/1000
            </p>
          </div>
        </div>

        {/* AI Analysis Request */}
        {isNewApplication && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="requestAnalysis"
                  type="checkbox"
                  checked={formData.requestAnalysis}
                  onChange={(e) => handleInputChange('requestAnalysis', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="requestAnalysis" className="text-sm font-medium text-blue-900">
                  Analyze with AI
                </label>
                <p className="text-sm text-blue-700 mt-1">
                  Get AI-powered insights on your resume-job fit, including matching skills, gaps, and next steps.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (isNewApplication ? 'Create Application' : 'Update Application')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ApplicationDetail