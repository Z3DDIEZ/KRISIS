import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { getDocs, collection, query, orderBy } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import { motion } from 'framer-motion'
import Icon from '../components/ui/Icon'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import { handleError } from '../lib/ErrorHandler'
import UrgentActions from '../components/ui/UrgentActions'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { TacticalBrief } from '../components/TacticalBrief'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
  latestAnalysis?: {
    fitScore: number
    ghostingRisk: number
    tacticalSignal: string
    urgencyLevel: number
  }
}

interface DashboardStats {
  totalApplications: number
  interviews: number
  offers: number
  urgentCount: number
  successRate: number
}

/**
 * Dashboard page with application overview, urgent actions, and recent activity.
 * @returns The dashboard view.
 */
function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    offers: 0,
    urgentCount: 0,
    successRate: 0,
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
          new Promise((resolve) => setTimeout(resolve, 300)), // Baseline check latency simulation
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
          const daysOld = Math.floor(
            (new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24)
          )
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
          successRate,
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
      .filter((app) => {
        const daysOld = Math.floor(
          (new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24)
        )
        return (app.status === 'Applied' || app.status.includes('Interview')) && daysOld > 14
      })
      .map((app) => {
        const daysOld = Math.floor(
          (new Date().getTime() - new Date(app.dateApplied).getTime()) / (1000 * 3600 * 24)
        )
        return {
          id: `urgent-${app.id}`,
          priority: (daysOld > 21 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          category: (app.status.includes('Interview') ? 'Assessment' : 'Follow-up') as
            | 'Assessment'
            | 'Follow-up',
          description: `Stagnant application at ${app.company}`,
          impact: `Risk: High - No response for ${daysOld} days`,
          daysAged: daysOld,
          appId: app.id,
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
        <p className="text-text-muted">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  const getBadgeVariant = (status: string) => {
    if (status === 'Applied') return 'applied'
    if (status.includes('Phone')) return 'phone-screen'
    if (status.includes('Technical')) return 'technical'
    if (status.includes('Final')) return 'final'
    if (status === 'Offer') return 'offer'
    return 'rejected'
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-screen px-6 sm:px-8 pb-16 pt-6 flex flex-col gap-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Strategic Overview"
          description="Synthesising your market position and application velocity."
          action={
            <Link to="/applications/new">
              <Button variant="primary" className="gap-2">
                <Icon name="work" size={18} />
                New Deployment
              </Button>
            </Link>
          }
        />
      </motion.div>

      {/* Strategic Intelligence Brief */}
      <motion.div variants={itemVariants}>
        <TacticalBrief />
      </motion.div>

      {/* Stats Grid */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        aria-label="Pipeline summary"
      >
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
          change={stats.interviews > 0 ? 'Action required' : undefined}
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
      </motion.section>

      {/* Urgent Actions */}
      <motion.div variants={itemVariants}>
        <UrgentActions actions={urgentActionsData} />
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden" aria-labelledby="recent-activity-heading">
          <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-bg-subtle">
            <h2 id="recent-activity-heading" className="text-sm font-semibold text-text-primary">
              Recent Tactical Data
            </h2>
          </div>

          <div className="p-0">
            {applications.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-primary-100/70 rounded-2xl border border-primary-200 flex items-center justify-center mx-auto mb-6">
                  <Icon name="work" size={40} className="text-primary-600" />
                </div>
                <h3 className="heading-md text-text-primary mb-2">Pipeline Empty</h3>
                <p className="text-text-muted mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                  Start tracking your job applications to get AI-powered insights and stay
                  organized.
                </p>
                <Link to="/applications/new">
                  <Button variant="primary" className="gap-2 px-8 py-3">
                    <Icon name="work" size={18} />
                    Initialize Tracking
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {applications.slice(0, 10).map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-6 hover:bg-bg-subtle transition-colors group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-bg-surface border border-border rounded-lg flex items-center justify-center font-semibold text-lg text-primary-600 shadow-sm group-hover:scale-105 transition-transform">
                        {application.company.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-text-primary text-sm">
                          {application.company}
                        </h4>
                        <p className="text-xs text-text-muted">{application.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* AI Signals */}
                      {application.latestAnalysis && (
                        <div className="hidden lg:flex items-center gap-6">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-text-muted">Match</span>
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                application.latestAnalysis.fitScore >= 70
                                  ? 'text-success'
                                  : application.latestAnalysis.fitScore >= 40
                                    ? 'text-warning'
                                    : 'text-error'
                              }`}
                            >
                              {application.latestAnalysis.fitScore}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-text-muted">Risk</span>
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                application.latestAnalysis.ghostingRisk >= 70
                                  ? 'text-error'
                                  : application.latestAnalysis.ghostingRisk >= 40
                                    ? 'text-warning'
                                    : 'text-success'
                              }`}
                            >
                              {application.latestAnalysis.ghostingRisk}%
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="hidden md:block text-right">
                        <p className="text-xs font-semibold text-text-muted mb-1">Deployed</p>
                        <p className="text-xs font-semibold text-text-primary tabular-nums">
                          {formatDateForDisplay(application.dateApplied)}
                        </p>
                      </div>
                      <Badge variant={getBadgeVariant(application.status)}>
                        {application.status}
                      </Badge>
                      <Link
                        to={`/applications/${application.id}`}
                        className="p-2 text-text-muted hover:text-primary-600 transition-colors"
                      >
                        <Icon name="visibility" size={18} />
                      </Link>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-bg-subtle text-center">
                  <Link
                    to="/applications"
                    className="text-xs font-semibold text-text-secondary hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                  >
                    View Comprehensive Pipeline ({applications.length})
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default Dashboard
