import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
}

interface DashboardStats {
  totalApplications: number
  interviews: number
  aiAnalyses: number
  successRate: number
}

function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    aiAnalyses: 0,
    successRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch recent applications (limit to 5 for dashboard)
    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc'),
      limit(5)
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: Application[] = []
      let totalApps = 0
      let interviews = 0
      let offers = 0

      querySnapshot.forEach((doc) => {
        const app = { id: doc.id, ...doc.data() } as Application
        apps.push(app)
        totalApps++

        // Count interviews (Phone Screen, Technical Interview, Final Round)
        if (['Phone Screen', 'Technical Interview', 'Final Round'].includes(app.status)) {
          interviews++
        }

        // Count offers
        if (app.status === 'Offer') {
          offers++
        }
      })

      // Calculate success rate (offers / total applications)
      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0

      setApplications(apps)
      setStats({
        totalApplications: totalApps,
        interviews,
        aiAnalyses: 0, // Will be updated when AI analysis is implemented
        successRate
      })
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

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
        <p className="text-gray-500">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary mb-sm">Dashboard</h1>
        <p className="text-secondary text-base">Welcome to KRISIS - Your job application intelligence platform</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-xl">
        {/* Total Applications - Clickable */}
        <Link to="/applications" className="stat-card group">
          <div className="stat-icon blue">
            📋
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.totalApplications}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Total Applications</div>
          </div>
        </Link>

        {/* Interviews */}
        <div className="stat-card">
          <div className="stat-icon green">
            ✅
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.interviews}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Interviews</div>
          </div>
        </div>

        {/* AI Analyses */}
        <div className="stat-card">
          <div className="stat-icon orange">
            🤖
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.aiAnalyses}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">AI Analyses</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card">
          <div className="stat-icon blue">
            📈
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.successRate}%</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Applications</h3>
          <Link to="/applications/new" className="btn btn-orange">
            Add Application
          </Link>
        </div>

        <div className="card-body">
          {applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No applications yet</h3>
              <p className="empty-description">Get started by adding your first job application.</p>
              <Link to="/applications/new" className="btn btn-orange">
                Add Your First Application
              </Link>
            </div>
          ) : (
            <div className="space-y-md">
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
                    <Link
                      to={`/applications/${application.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}

              {applications.length >= 5 && (
                <div className="text-center pt-lg">
                  <Link
                    to="/applications"
                    className="btn btn-ghost"
                  >
                    View all applications →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard