import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'
import StatCard from '../components/ui/StatCard'
import { AsymmetricGrid, AsymmetricCard } from '../components/ui/AsymmetricGrid'

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

        if (['Phone Screen', 'Technical Interview', 'Final Round'].includes(app.status)) {
          interviews++
        }

        if (app.status === 'Offer') {
          offers++
        }
      })

      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0

      setApplications(apps)
      setStats({
        totalApplications: totalApps,
        interviews,
        offers,
        aiAnalyses: 0,
        successRate
      })
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in min-h-screen p-spacing-4 flex flex-col gap-spacing-6">
      <header className="page-header relative">
        <div className="absolute -top-spacing-6 -left-spacing-6 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="asymmetric-header">
          <h1 className="text-4xl lg:text-5xl font-black text-primary tracking-tighter uppercase leading-none mb-spacing-2">
            Intelligence <br />
            <span className="text-outline">Dashboard</span>
          </h1>
          <p className="text-secondary font-medium tracking-tight page-header__subtitle max-w-md">
            Swiss-engineered tracking for the modern software professional. Precise. Fast. Minimal.
          </p>
        </div>
      </header>

      {/* Stats Grid - Asymmetric Pattern */}
      <AsymmetricGrid>
        <AsymmetricCard size="large">
          <StatCard
            label="Total pipeline"
            value={stats.totalApplications}
            icon="work"
            change="12% increase"
            trend="up"
          />
        </AsymmetricCard>
        <AsymmetricCard size="small">
          <StatCard
            label="Active Interviews"
            value={stats.interviews}
            icon="person"
            change="4 new items"
            trend="up"
          />
        </AsymmetricCard>
        <AsymmetricCard size="small">
          <StatCard
            label="Secured Offers"
            value={stats.offers}
            icon="check"
            change="High velocity"
            trend="up"
          />
        </AsymmetricCard>
        <AsymmetricCard size="large">
          <StatCard
            label="Success Quotient"
            value={`${stats.successRate}%`}
            icon="trending-up"
            change="Optimizing flow"
            trend="neutral"
          />
        </AsymmetricCard>
      </AsymmetricGrid>

      <div className="card">
        <div className="px-6 py-5 border-b border-border-light flex justify-between items-center">
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
            <div className="divide-y divide-border">
              {applications.slice(0, 10).map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-900 text-white rounded flex items-center justify-center font-black text-xl">
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

              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 text-center">
                <Link
                  to="/applications"
                  className="text-xs font-black text-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  Inspect Full Pipeline ({applications.length} items)
                  <Icon name="arrow-forward" size={14} />
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