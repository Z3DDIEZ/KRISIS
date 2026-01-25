import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { exportChartToPng } from '../utils/exportHelpers'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import BarChart from '../components/ui/BarChart'
import LineChart from '../components/ui/LineChart'
import LazyLoad from '../components/ui/LazyLoad'
import BackToTop from '../components/ui/BackToTop'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
  visaSponsorship: boolean
  createdAt?: any
  updatedAt?: any
}

interface AnalyticsData {
  totalApplications: number
  statusBreakdown: Record<string, number>
  monthlyTrend: Array<{ month: string; count: number }>
  topCompanies: Array<{ company: string; count: number }>
  responseRate: number
  avgTimeToResponse: number
  visaSponsorshipRate: number
}

function Analytics() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '6months' | '3months' | '1month' | 'custom'>('all')
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Applied': 'var(--status-applied)',
      'Phone Screen': 'var(--status-phone)',
      'Technical Interview': 'var(--status-technical)',
      'Final Round': 'var(--status-final)',
      'Offer': 'var(--status-offer)',
      'Rejected': 'var(--status-rejected)'
    }
    return colors[status] || 'var(--status-applied)'
  }

  // Load applications data
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
        const data = doc.data()
        apps.push({
          id: doc.id,
          company: data.company || '',
          role: data.role || '',
          dateApplied: data.dateApplied || '',
          status: data.status || 'Applied',
          visaSponsorship: Boolean(data.visaSponsorship),
          notes: data.notes,
          resumeUrl: data.resumeUrl,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        })
      })
      setApplications(apps)
      calculateAnalytics(apps)
      setIsLoading(false)
    }, (error) => {
      console.error('Error loading applications:', error)
      toast.error('Failed to load analytics data')
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user, selectedTimeframe, customDateRange])

  // Recalculate when timeframe changes
  useEffect(() => {
    if (applications.length > 0) {
      calculateAnalytics(applications)
    }
  }, [selectedTimeframe, customDateRange])

  const calculateAnalytics = (apps: Application[]) => {
    if (apps.length === 0) {
      setAnalytics({
        totalApplications: 0,
        statusBreakdown: {},
        monthlyTrend: [],
        topCompanies: [],
        responseRate: 0,
        avgTimeToResponse: 0,
        visaSponsorshipRate: 0
      })
      return
    }

    // Filter by timeframe
    let filteredApps = apps
    if (selectedTimeframe === 'custom' && customDateRange.start && customDateRange.end) {
      const startDate = new Date(customDateRange.start)
      const endDate = new Date(customDateRange.end)
      endDate.setHours(23, 59, 59, 999) // Include entire end date
      filteredApps = apps.filter(app => {
        const appDate = new Date(app.dateApplied)
        return appDate >= startDate && appDate <= endDate
      })
    } else {
      const now = new Date()
      const cutoffDate = new Date()
      switch (selectedTimeframe) {
        case '1month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3)
          break
        case '6months':
          cutoffDate.setMonth(now.getMonth() - 6)
          break
        default:
          cutoffDate.setFullYear(2000) // Include all
      }
      filteredApps = apps.filter(app => new Date(app.dateApplied) >= cutoffDate)
    }

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    filteredApps.forEach(app => {
      statusBreakdown[app.status] = (statusBreakdown[app.status] || 0) + 1
    })

    // Monthly trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const count = apps.filter(app => {
        const appDate = new Date(app.dateApplied)
        return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear()
      }).length

      monthlyTrend.push({ month: monthKey, count })
    }

    // Top companies
    const companyCounts: Record<string, number> = {}
    filteredApps.forEach(app => {
      companyCounts[app.company] = (companyCounts[app.company] || 0) + 1
    })

    const topCompanies = Object.entries(companyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }))

    // Response rate (applications that moved beyond "Applied")
    const respondedApps = filteredApps.filter(app =>
      !['Applied'].includes(app.status)
    )
    const responseRate = filteredApps.length > 0
      ? Math.round((respondedApps.length / filteredApps.length) * 100)
      : 0

    // Visa sponsorship rate
    const visaApps = filteredApps.filter(app => app.visaSponsorship)
    const visaSponsorshipRate = filteredApps.length > 0
      ? Math.round((visaApps.length / filteredApps.length) * 100)
      : 0

    setAnalytics({
      totalApplications: filteredApps.length,
      statusBreakdown,
      monthlyTrend,
      topCompanies,
      responseRate,
      avgTimeToResponse: 14, // Placeholder - would need actual response date tracking
      visaSponsorshipRate
    })
  }

  const handleExportChart = async (chartId: string, filename: string) => {
    const chartElement = document.getElementById(chartId)
    if (!chartElement) {
      toast.error('Chart not found')
      return
    }

    const success = exportChartToPng(chartElement as any, filename)
    if (success) {
      toast.success('Chart exported successfully!')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary">Please sign in to view analytics.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in w-full">
      {/* Header */}
      <div className="mb-2xl">
        <h1 className="text-3xl font-bold text-primary mb-sm">Analytics Dashboard</h1>
        <p className="text-secondary text-base">Insights and trends from your job applications</p>
      </div>

      {/* Timeframe Selector */}
      <div className="mb-xl">
        <div className="inline-flex p-1 bg-surface-2 rounded-xl border border-border-light shadow-sm mb-md">
          {[
            { key: 'all', label: 'All Time' },
            { key: '6months', label: '6 Months' },
            { key: '3months', label: '3 Months' },
            { key: '1month', label: '1 Month' },
            { key: 'custom', label: 'Custom' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setSelectedTimeframe(key as any)
                if (key !== 'custom') {
                  setCustomDateRange({ start: '', end: '' })
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedTimeframe === key
                ? 'bg-primary-orange text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-3'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Input */}
        {selectedTimeframe === 'custom' && (
          <div className="flex flex-wrap items-center gap-md p-md bg-surface-2 border border-border-light rounded-xl animate-fade-in">
            <div className="flex items-center gap-sm">
              <label className="text-xs font-bold text-secondary uppercase tracking-tight">From:</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="input py-1 text-sm bg-background-white"
                max={customDateRange.end || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex items-center gap-sm">
              <label className="text-xs font-bold text-secondary uppercase tracking-tight">To:</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="input py-1 text-sm bg-background-white"
                min={customDateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid--metrics mb-2xl">
            <div className="stat-card">
              <div className="stat-card__content">
                <div className="stat-card__value">{analytics.totalApplications}</div>
                <div className="stat-card__label">Total Applications</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__content">
                <div className="stat-card__value">{analytics.responseRate}%</div>
                <div className="stat-card__label">Response Rate</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__content">
                <div className="stat-card__value">{analytics.visaSponsorshipRate}%</div>
                <div className="stat-card__label">Visa Sponsors</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__content">
                <div className="stat-card__value">
                  {analytics.statusBreakdown['Offer'] || 0}
                </div>
                <div className="stat-card__label">Offers Received</div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid--content mb-2xl">
            {/* Status Distribution */}
            <LazyLoad
              data-track-lazy="status-chart"
              className="h-full"
              placeholder={<div className="card h-[500px] animate-pulse" />}
            >
              <div className="card h-full flex flex-col" data-section="status-chart">
                <div className="card__header">
                  <h3 className="card__title flex items-center gap-2">
                    <Icon name="pie-chart" size={18} />
                    Status Distribution
                  </h3>
                  <button
                    onClick={() => handleExportChart('status-chart', 'status-distribution.png')}
                    className="btn btn--ghost btn--sm"
                    aria-label="Export Chart"
                  >
                    <Icon name="download" size={14} />
                  </button>
                </div>
                <div className="card__body flex-1 flex flex-col gap-6 overflow-visible">
                  <div className="flex-1 min-h-[300px]" id="status-chart">
                    <BarChart
                      data={Object.entries(analytics.statusBreakdown).map(([status, count]) => ({
                        label: status,
                        value: count,
                        color: getStatusColor(status)
                      }))}
                      height={300}
                      animate={true}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-light/30">
                    {Object.entries(analytics.statusBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => {
                        const percentage = analytics.totalApplications > 0
                          ? Math.round((count / analytics.totalApplications) * 100)
                          : 0
                        const statusColor = getStatusColor(status)
                        return (
                          <div key={status} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-secondary">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                                {status}
                              </span>
                              <span>{count} ({percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: `${percentage}%`,
                                  background: statusColor,
                                  boxShadow: `0 0 8px ${statusColor}40`
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </LazyLoad>

            {/* Monthly Trend */}
            <LazyLoad
              data-track-lazy="trend-chart"
              className="h-full"
              placeholder={<div className="card h-[500px] animate-pulse" />}
            >
              <div className="card h-full flex flex-col" data-section="trend-chart">
                <div className="card__header">
                  <h3 className="card__title flex items-center gap-2">
                    <Icon name="trending-up" size={18} />
                    Application Trends
                  </h3>
                  <button
                    onClick={() => handleExportChart('trend-chart', 'application-trends.png')}
                    className="btn btn--ghost btn--sm"
                  >
                    <Icon name="download" size={14} />
                  </button>
                </div>
                <div className="card__body flex-1 flex flex-col gap-6 overflow-visible">
                  <div className="flex-1 min-h-[300px] w-full" id="trend-chart">
                    <LineChart
                      data={analytics.monthlyTrend.map(month => ({
                        label: month.month.split(' ')[0], // Short month only
                        value: month.count,
                        color: 'var(--primary-orange)'
                      }))}
                      height={300}
                      animate={true}
                    />
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 pt-4 border-t border-border-light/30">
                    {analytics.monthlyTrend.slice(-6).map((month, _index) => {
                      const maxCount = Math.max(...analytics.monthlyTrend.map(m => m.count), 1)
                      const percentage = (month.count / maxCount) * 100
                      return (
                        <div key={month.month} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-secondary uppercase whitespace-nowrap">{month.month.split(' ')[0]}</span>
                          <span className="text-sm font-bold text-primary">{month.count}</span>
                          <div className="w-full h-1 bg-surface-3 rounded-full mt-1">
                            <div
                              className="h-full bg-primary-orange rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-2 p-3 bg-primary-orange-bg border border-primary-orange/10 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary-orange/10 rounded-lg text-primary-orange">
                        <Icon name="trending-up" size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-primary-orange uppercase tracking-wide">Trend Analysis</div>
                        <div className="text-sm text-primary font-medium mt-0.5">
                          {analytics.monthlyTrend.slice(-3).reduce((sum, month) => sum + month.count, 0) >
                            analytics.monthlyTrend.slice(-6, -3).reduce((sum, month) => sum + month.count, 0)
                            ? 'Application activity is trending up over the last quarter.'
                            : 'Consider increasing your reach to boost upcoming interview chances.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </LazyLoad>
          </div>

          {/* Top Companies */}
          <div className="card mb-2xl">
            <div className="card-header">
              <h3 className="card-title">Top Companies</h3>
            </div>
            <div className="card-body">
              <div className="space-y-md">
                {analytics.topCompanies.map((company, index) => (
                  <div key={company.company} className="flex items-center justify-between">
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-background-light text-secondary'
                        }`}>
                        {index + 1}
                      </div>
                      <span className="text-primary font-medium">{company.company}</span>
                    </div>
                    <span className="text-secondary">{company.count} applications</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            <div className="card border border-border-light hover:shadow-xl transition-all">
              <div className="card-header border-b border-border-light">
                <h3 className="card-title flex items-center gap-2">
                  <Icon name="bolt" size={18} className="text-primary-orange" />
                  Key Insights
                </h3>
              </div>
              <div className="card-body p-xl space-y-md">
                <div className="p-lg bg-surface-2 border border-border-light rounded-2xl flex gap-md group hover:border-primary-orange/20 transition-all">
                  <div className="p-2.5 bg-background-white shadow-sm rounded-xl text-primary-orange h-fit">
                    <Icon name="info" size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Response Velocity</div>
                    <div className="text-xl font-bold text-primary mb-1">{analytics.responseRate}%</div>
                    <div className="text-xs text-secondary font-medium">
                      Of your total pipeline successfully advanced beyond initial application stage.
                    </div>
                  </div>
                </div>

                <div className="p-lg bg-surface-2 border border-border-light rounded-2xl flex gap-md group hover:border-status-success/20 transition-all">
                  <div className="p-2.5 bg-background-white shadow-sm rounded-xl text-status-success h-fit">
                    <Icon name="verified" size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Conversion Rate</div>
                    <div className="text-xl font-bold text-primary mb-1">
                      {analytics.statusBreakdown['Offer'] || 0} <span className="text-xs text-secondary font-medium">Offers</span>
                    </div>
                    <div className="text-xs text-secondary font-medium">
                      Final offers generated from your current tracked network.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border border-border-light hover:shadow-xl transition-all">
              <div className="card-header border-b border-border-light">
                <h3 className="card-title flex items-center gap-2">
                  <Icon name="lightbulb" size={18} className="text-primary-orange" />
                  Strategic Actions
                </h3>
              </div>
              <div className="card-body p-xl space-y-md">
                {analytics.responseRate < 30 && (
                  <div className="p-lg bg-primary-orange-bg border border-primary-orange/10 rounded-2xl flex gap-md">
                    <div className="p-2 bg-primary-orange/10 rounded-xl text-primary-orange h-fit">
                      <Icon name="warning" size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-1">Optimize Materials</h4>
                      <p className="text-xs text-secondary font-medium leading-relaxed">
                        Your response rate is below benchmark. Consider refining your resume or cover letter strategy.
                      </p>
                    </div>
                  </div>
                )}

                {analytics.visaSponsorshipRate < 50 && (
                  <div className="p-lg bg-surface-2 border border-border-light rounded-2xl flex gap-md">
                    <div className="p-2 bg-surface-3 rounded-xl text-secondary h-fit">
                      <Icon name="public" size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-1">Expansion Strategy</h4>
                      <p className="text-xs text-secondary font-medium leading-relaxed">
                        Currently highlighting {analytics.visaSponsorshipRate}% sponsorship. Cast a wider net for global roles.
                      </p>
                    </div>
                  </div>
                )}

                {analytics.totalApplications < 10 && (
                  <div className="p-lg bg-blue-50/30 border border-blue-100 rounded-2xl flex gap-md">
                    <div className="p-2 bg-blue-100/50 rounded-xl text-blue-600 h-fit">
                      <Icon name="add" size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-1">Build Volume</h4>
                      <p className="text-xs text-secondary font-medium leading-relaxed">
                        Consistent volume is key. Aim for 5-10 targeted applications weekly to maintain momentum.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  )
}

export default Analytics