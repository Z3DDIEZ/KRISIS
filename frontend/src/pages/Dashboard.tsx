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
      <header className="page-header">
        <h1 className="text-3xl font-black text-primary tracking-tighter uppercase page-header__title">Intelligence Dashboard</h1>
        <p className="text-secondary font-medium tracking-tight page-header__subtitle">Real-time pipeline analytics and application tracking.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total pipeline', value: stats.totalApplications, icon: 'work', change: '12% increase' },
          { label: 'Active Interviews', value: stats.interviews, icon: 'person', change: '4 new items' },
          { label: 'Secured Offers', value: stats.offers, icon: 'check', change: 'High velocity' },
          { label: 'Success Quotient', value: `${stats.successRate}%`, icon: 'trending-up', change: 'Optimizing flow' }
        ].map((stat, i) => (
          <div key={i} className="stat-card group">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{stat.label}</span>
              <div className="p-2.5 bg-surface-2 text-muted group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors rounded-md">
                <Icon name={stat.icon} size={14} />
              </div>
            </div>
            <div className="text-4xl font-black text-primary mb-2 leading-none">{stat.value}</div>
            <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-6 py-5 border-b border-border-light flex justify-between items-center bg-surface-2/50">
          <h3 className="text-xs font-black text-muted uppercase tracking-widest">Recent Activity</h3>
          <Link to="/applications/new" className="text-[11px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-600 transition-colors">
            Add Entry +
          </Link>
        </div>

        <div className="p-0">
          {applications.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="work" size={32} className="text-muted" />
              </div>
              <h3 className="text-lg font-black text-primary mb-2 uppercase">Zero Records Detected</h3>
              <p className="text-secondary mb-8 max-w-xs mx-auto font-medium">Initiate your pipeline by adding your first job application record.</p>
              <Link to="/applications/new" className="btn btn-primary px-8">
                GENERATE FIRST RECORD
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {applications.slice(0, 10).map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-6 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-contrast text-text-on-contrast rounded flex items-center justify-center font-black text-xl">
                      {application.company.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary uppercase text-xs tracking-tight">{application.company}</h4>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">{application.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Applied</p>
                      <p className="text-xs font-bold text-primary">{formatDateForDisplay(application.dateApplied)}</p>
                    </div>
                    <div className={`badge ${application.status === 'Applied' ? 'badge-applied' :
                      application.status === 'Phone Screen' ? 'badge-phone-screen' :
                        application.status === 'Technical Interview' ? 'badge-technical' :
                          application.status === 'Final Round' ? 'badge-final' :
                            application.status === 'Offer' ? 'badge-offer' :
                              'badge-rejected'
                      }`}>
                      {application.status}
                    </div>
                    <Link
                      to={`/applications/${application.id}`}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Icon name="visibility" size={18} />
                    </Link>
                  </div>
                </div>
              ))}

              <div className="p-6 bg-surface-2/30 text-center">
                <Link
                  to="/applications"
                  className="text-xs font-black text-muted uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Inspect Full Pipeline ({applications.length} items) →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard