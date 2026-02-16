import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  getDocs,
  collection,
  query,
  orderBy
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import { handleError } from '../lib/ErrorHandler'
import UrgentActions from '../components/ui/UrgentActions'

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
  urgentCount: number
  successRate: number
}

function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    offers: 0,
    urgentCount: 0,
    successRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      if (!loading) setIsLoading(false)
      return
    }

    const loadDashboardData = async () => {
      try {
        const q = query(
          collection(db, `users/${user.uid}/applications`),
          orderBy('dateApplied', 'desc')
        )

        // H2U Pattern: Parallel async orchestration
        const [querySnapshot] = await Promise.all([
          getDocs(q),
          new Promise(resolve => setTimeout(resolve, 300)) // Baseline check latency simulation
        ])

        const apps: Application[] = []
        let totalApps = 0
        let interviews = 0
        let offers = 0
        let urgentCount = 0

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const app = { id: doc.id, ...data } as Application
          apps.push(app)
          totalApps++

          if (['Phone Screen', 'Technical Interview', 'Final Round'].includes(app.status)) {
            interviews++
          }

          if (app.status === 'Offer') {
            offers++
          }

          // Urgent Logic: No activity in 14 days
          const daysOld = Math.floor((new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24))
          if ((app.status === 'Applied' || app.status.includes('Interview')) && daysOld > 14) {
            urgentCount++
          }
        })

        const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0

        setApplications(apps)
        setStats({
          totalApplications: totalApps,
          interviews,
          offers,
          urgentCount,
          successRate
        })
      } catch (err) {
        handleError(err, 'Dashboard Load')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [user, loading])

  const urgentActionsData = useMemo(() => {
    return applications
      .filter(app => {
        const daysOld = Math.floor((new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24))
        return (app.status === 'Applied' || app.status.includes('Interview')) && daysOld > 14
      })
      .map(app => {
        const daysOld = Math.floor((new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24))
        return {
          id: `urgent-${app.id}`,
          priority: (daysOld > 21 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          category: (app.status.includes('Interview') ? 'Assessment' : 'Follow-up') as 'Assessment' | 'Follow-up',
          description: `Stagnant application at ${app.company}`,
          impact: `Risk: High - No response for ${daysOld} days`,
          daysAged: daysOld,
          appId: app.id
        }
      })
      .slice(0, 5)
  }, [applications])

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
    <div className="animate-fade-in min-h-screen p-6 flex flex-col gap-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Track your job search progress and stay on top of upcoming interviews."
        action={
          <Link
            to="/applications/new"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide rounded-lg"
          >
            <Icon name="work" size={18} />
            New Application
          </Link>
        }
      />

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Pipeline summary">
        <StatCard
          label="Total Applications"
          value={stats.totalApplications}
          icon="work"
          insight="All active applications"
          change="1.2% this week"
          trend="up"
        />
        <StatCard
          label="Active Interviews"
          value={stats.interviews}
          icon="person"
          insight="Upcoming or in-progress"
          change={stats.interviews > 0 ? "Action required" : undefined}
          trend="up"
        />
        <StatCard
          label="Needs Attention"
          value={stats.urgentCount}
          icon="warning"
          insight="No activity in 14+ days"
          isUrgent={stats.urgentCount > 0}
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate}%`}
          icon="trending-up"
          insight="Offer conversion rate"
          change="Optimizing"
          trend="neutral"
        />
      </section>

      {/* Urgent Actions */}
      <UrgentActions actions={urgentActionsData} />

      {/* Recent Activity */}
      <section className="premium-card overflow-hidden" aria-labelledby="recent-activity-heading">
        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-subtle/30">
          <h2 id="recent-activity-heading" className="text-sm font-bold text-text-primary">Recent Activity</h2>
        </div>

        <div className="p-0">
          {applications.length === 0 ? (
            <div className="p-16 text-center empty-state">
              <div className="w-20 h-20 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Icon name="work" size={40} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Build Your Pipeline</h3>
              <p className="text-text-secondary mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Start tracking your job applications to get AI-powered insights and stay organized.
              </p>
              <Link to="/applications/new" className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-lg font-bold uppercase tracking-wide">
                <Icon name="work" size={18} />
                Add First Application
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {applications.slice(0, 10).map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-6 hover:bg-bg-subtle/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center font-black text-xl text-primary-600 shadow-sm">
                      {application.company.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary text-sm group-hover:text-primary-600 transition-colors">{application.company}</h4>
                      <p className="text-xs font-medium text-text-secondary">{application.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Applied</p>
                      <p className="text-xs font-bold text-text-primary">{formatDateForDisplay(application.dateApplied)}</p>
                    </div>
                    <div className={`badge ${application.status === 'Applied' ? 'badge-applied' :
                      application.status.includes('Phone') ? 'badge-phone-screen' :
                        application.status.includes('Technical') ? 'badge-technical' :
                          application.status.includes('Final') ? 'badge-final' :
                            application.status === 'Offer' ? 'badge-offer' :
                              'badge-rejected'
                      }`}>
                      {application.status}
                    </div>
                    <Link
                      to={`/applications/${application.id}`}
                      className="p-2 text-text-muted hover:text-primary-600 transition-colors"
                    >
                      <Icon name="visibility" size={18} />
                    </Link>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-bg-subtle/20 text-center border-t border-border-subtle">
                <Link
                  to="/applications"
                  className="text-xs font-bold text-text-secondary hover:text-primary-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  View All Applications ({applications.length})
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Dashboard