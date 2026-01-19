import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import { toast } from 'sonner'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
}

const statusColors = {
  'Applied': 'bg-gray-100 text-gray-800',
  'Phone Screen': 'bg-blue-100 text-blue-800',
  'Technical Interview': 'bg-yellow-100 text-yellow-800',
  'Final Round': 'bg-purple-100 text-purple-800',
  'Offer': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800'
}

function Applications() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: Application[] = []
      querySnapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() } as Application)
      })
      setApplications(apps)
      setIsLoading(false)
    }, (error) => {
      console.error('Error loading applications:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        userId: user.uid
      })
      toast.error(`Failed to load applications: ${error.message}`)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleDelete = async (applicationId: string, company: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to delete your application at ${company}?`)) {
      return
    }

    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications/${applicationId}`))
      toast.success('Application deleted successfully')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application')
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
        <p className="text-gray-500">Please sign in to view your applications.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-xl">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-sm">Applications</h1>
          <p className="text-secondary text-base">Manage all your job applications</p>
        </div>
        <Link to="/applications/new" className="btn btn-orange">
          ➕ Add Application
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No applications yet</h3>
              <p className="empty-description">Start tracking your job applications to get AI-powered insights.</p>
              <Link to="/applications/new" className="btn btn-orange">
                Add Your First Application
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {applications.map((application) => (
            <div key={application.id} className="application-card">
              <div className="application-card-header">
                <div className="company-logo bg-primary-orange-bg">
                  <span className="text-primary-orange font-semibold">
                    {application.company.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="company-info">
                  <div className="company-name">
                    {application.company} - {application.role}
                  </div>
                  <div className="position-title text-secondary">
                    Applied {formatDateForDisplay(application.dateApplied)}
                  </div>
                </div>
              </div>

              <div className="application-card-footer">
                <div className={`badge ${
                  application.status === 'Applied' ? 'badge-applied' :
                  application.status === 'Phone Screen' ? 'badge-phone' :
                  application.status === 'Technical Interview' ? 'badge-technical' :
                  application.status === 'Final Round' ? 'badge-final' :
                  application.status === 'Offer' ? 'badge-offer' :
                  'badge-rejected'
                }`}>
                  {application.status}
                </div>
                <div className="card-actions">
                  <Link
                    to={`/applications/${application.id}`}
                    className="icon-button"
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={() => handleDelete(application.id, application.company)}
                    className="icon-button"
                    style={{ color: 'var(--status-rejected)' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications