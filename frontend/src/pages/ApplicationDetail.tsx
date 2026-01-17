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
  const [isLoading, setIsLoading] = useState(!isNewApplication)

  // Load existing application data
  useEffect(() => {
    if (!isNewApplication && user && id) {
      loadApplication()
    }
  }, [user, id, isNewApplication])

  const loadApplication = async () => {
    if (!user || !id) return

    try {
      const docRef = doc(db, `users/${user.uid}/applications/${id}`)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setFormData({
          company: data.company || '',
          role: data.role || '',
          status: data.status || 'Applied',
          dateApplied: data.dateApplied || getTodayDate(),
          notes: data.notes || '',
          resumeUrl: data.resumeUrl || '',
          requestAnalysis: false // Reset to false for edits
        })
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

  const handleInputChange = (field: keyof ApplicationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDateChange = (dateString: string) => {
    try {
      const normalizedDate = validateAndNormalizeDate(dateString, true)
      setFormData(prev => ({ ...prev, dateApplied: normalizedDate }))
    } catch (error) {
      toast.error('Invalid date format')
    }
  }

  const validateForm = (): boolean => {
    if (!formData.company.trim()) {
      toast.error('Company name is required')
      return false
    }
    if (!formData.role.trim()) {
      toast.error('Role is required')
      return false
    }
    if (!formData.dateApplied) {
      toast.error('Date applied is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !validateForm()) return

    setIsSubmitting(true)
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
    } catch (error) {
      console.error('Error saving application:', error)
      toast.error('Failed to save application')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Google, Microsoft"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Software Engineer"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formData.dateApplied && (
              <p className="mt-1 text-sm text-gray-500">
                {formatDateForDisplay(formData.dateApplied)}
              </p>
            )}
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
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional details about this application..."
          />
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