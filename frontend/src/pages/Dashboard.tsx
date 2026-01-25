import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
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
  offers: number
  aiAnalyses: number
  successRate: number
}

function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    offers: 0,
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
        offers, // Fixed: Now properly includes offers count
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
        <Link to="/applications" className="stat-card group" data-track-section="total-apps">
          <div className="stat-card__icon stat-card__icon--blue">
            <Icon name="work" size={20} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.totalApplications}</div>
            <div className="stat-card__label">Total Applications</div>
          </div>
        </Link>

        {/* Interviews */}
        <div className="stat-card" data-track-section="interviews">
          <div className="stat-card__icon stat-card__icon--green">
            <Icon name="call" size={20} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.interviews}</div>
            <div className="stat-card__label">Interviews</div>
          </div>
        </div>

        {/* Offers */}
        <div className="stat-card" data-track-section="offers">
          <div className="stat-card__icon stat-card__icon--purple">
            <Icon name="offer" size={20} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.offers || 0}</div>
            <div className="stat-card__label">Offers Received</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card" data-track-section="success-rate">
          <div className="stat-card__icon stat-card__icon--orange">
            <Icon name="trending-up" size={20} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.successRate}%</div>
            <div className="stat-card__label">Success Rate</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-3 overflow-hidden">
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
              {applications.slice(0, 10).map((application) => (
                <div
                  key={application.id}
                  className="application-card"
                  data-track-action="view-application"
                  data-application-id={application.id}
                >
                  <div className="application-card__header">
                    <div className="application-card__logo bg-gradient-to-br from-primary-orange-bg to-primary-orange/20">
                      <span className="text-primary-orange font-semibold">
                        {application.company.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="application-card__info">
                      <div className="application-card__company">
                        {application.company} - {application.role}
                      </div>
                      <div className="application-card__role">
                        Applied {formatDateForDisplay(application.dateApplied)}
                      </div>
                    </div>
                  </div>

                  <div className="application-card__footer">
                    <div className={`badge ${application.status === 'Applied' ? 'badge--applied' :
                      application.status === 'Phone Screen' ? 'badge--phone' :
                        application.status === 'Technical Interview' ? 'badge--technical' :
                          application.status === 'Final Round' ? 'badge--final' :
                            application.status === 'Offer' ? 'badge--offer' :
                              'badge--rejected'
                      }`}>
                      {application.status}
                    </div>
                    <Link
                      to={`/applications/${application.id}`}
                      className="btn btn--ghost btn--sm"
                      data-track-action="view-details"
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