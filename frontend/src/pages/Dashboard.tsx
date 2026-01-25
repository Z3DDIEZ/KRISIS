import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'

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

    // Fetch all applications for dashboard overview
    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
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
            <Icon name="work" size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.totalApplications}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Total Applications</div>
          </div>
        </Link>

        {/* Interviews */}
        <div className="stat-card hover-lift animate-fade-in-scale stagger-2">
          <div className="stat-icon green hover-scale">
            <Icon name="call" size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.interviews}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Interviews</div>
          </div>
        </div>

        {/* Offers */}
        <div className="stat-card hover-lift animate-fade-in-scale stagger-3">
          <div className="stat-icon purple hover-scale">
            <Icon name="offer" size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.offers}</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Offers</div>
          </div>
          {stats.offers > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse-glow" />
          )}
        </div>

        {/* Success Rate */}
        <div className="stat-card hover-lift animate-fade-in-scale stagger-4">
          <div className="stat-icon orange hover-scale">
            <Icon name="trending-up" size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-value text-primary">{stats.successRate}%</div>
            <div className="stat-label text-secondary uppercase tracking-wide">Success Rate</div>
          </div>
          <div className="absolute bottom-2 left-2 right-2 h-1 bg-background-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-orange to-primary-orange-light transition-all duration-1000 ease-out"
              style={{
                width: `${stats.successRate}%`
              }}
            />
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
              <div className="empty-icon">
                <Icon name="work" size={48} />
              </div>
              <h3 className="empty-title">No applications yet</h3>
              <p className="empty-description">Get started by adding your first job application.</p>
              <Link to="/applications/new" className="btn btn-orange">
                Add Your First Application
              </Link>
            </div>
          ) : (
            <div className="space-y-md">
              {applications.slice(0, 10).map((application, index) => (
                <div
                  key={application.id}
                  className={`application-card hover-lift animate-slide-in-up stagger-${(index % 5) + 1}`}
                >
                  <div className="application-card-header">
                    <div className="company-logo bg-gradient-to-br from-primary-orange-bg to-primary-orange/20 hover-scale">
                      <span className="text-primary-orange font-semibold">
                        {application.company.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="company-info">
                      <div className="company-name font-medium text-primary">
                        {application.company} - {application.role}
                      </div>
                      <div className="position-title text-secondary">
                        Applied {formatDateForDisplay(application.dateApplied)}
                      </div>
                    </div>
                  </div>

                  <div className="application-card-footer">
                    <div className={`badge hover-scale ${
                      application.status === 'Applied' ? 'badge-applied' :
                      application.status === 'Phone Screen' ? 'badge-phone' :
                      application.status === 'Technical Interview' ? 'badge-technical' :
                      application.status === 'Final Round' ? 'badge-final' :
                      application.status === 'Offer' ? 'badge-offer badge-pulse' :
                      'badge-rejected'
                    }`}>
                      {application.status}
                    </div>
                    <Link
                      to={`/applications/${application.id}`}
                      className="btn btn-ghost btn-sm btn-ripple"
                    >
                      <Icon name="visibility" size={14} />
                      View Details
                    </Link>
                  </div>
                </div>
              ))}

              {applications.length > 10 && (
                <div className="text-center pt-lg">
                  <p className="text-secondary text-sm mb-md">
                    Showing 10 of {applications.length} applications
                  </p>
                  <Link
                    to="/applications"
                    className="btn btn-primary"
                  >
                    View All Applications →
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