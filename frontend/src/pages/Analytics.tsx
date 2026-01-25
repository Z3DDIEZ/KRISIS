import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { exportChartToPng } from '../utils/exportHelpers'
import { formatDateForDisplay } from '../lib/dateUtils'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import BarChart from '../components/ui/BarChart'
import LineChart from '../components/ui/LineChart'
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
      .sort(([,a], [,b]) => b - a)
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
        <div className="flex flex-wrap items-center gap-sm mb-md">
          {[
            { key: 'all', label: 'All Time' },
            { key: '6months', label: 'Last 6 Months' },
            { key: '3months', label: 'Last 3 Months' },
            { key: '1month', label: 'Last Month' },
            { key: 'custom', label: 'Custom Range' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setSelectedTimeframe(key as any)
                if (key !== 'custom') {
                  setCustomDateRange({ start: '', end: '' })
                }
              }}
              className={`btn ${selectedTimeframe === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            >
              {label}
            </button>
          ))}
          {(selectedTimeframe !== 'all' || customDateRange.start || customDateRange.end) && (
            <button
              onClick={() => {
                setSelectedTimeframe('all')
                setCustomDateRange({ start: '', end: '' })
              }}
              className="btn btn-ghost btn-sm text-secondary hover:text-primary"
            >
              <Icon name="clear" size={14} />
              Clear Filters
            </button>
          )}
        </div>

        {/* Custom Date Range Input */}
        {selectedTimeframe === 'custom' && (
          <div className="flex flex-wrap items-center gap-md p-md bg-background-light rounded-lg">
            <div className="flex items-center gap-sm">
              <label className="text-sm text-secondary whitespace-nowrap">From:</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="input"
                max={customDateRange.end || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex items-center gap-sm">
              <label className="text-sm text-secondary whitespace-nowrap">To:</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="input"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-2xl">
            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-value text-primary">{analytics.totalApplications}</div>
                <div className="stat-label text-secondary uppercase tracking-wide">Total Applications</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-value text-primary">{analytics.responseRate}%</div>
                <div className="stat-label text-secondary uppercase tracking-wide">Response Rate</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-value text-primary">{analytics.visaSponsorshipRate}%</div>
                <div className="stat-label text-secondary uppercase tracking-wide">Visa Sponsors</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-value text-primary">
                  {analytics.statusBreakdown['Offer'] || 0}
                </div>
                <div className="stat-label text-secondary uppercase tracking-wide">Offers Received</div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl mb-2xl">
            {/* Status Distribution */}
            <div className="card hover-lift animate-fade-in-scale">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-sm">
                  <Icon name="pie-chart" size={20} />
                  Application Status Distribution
                </h3>
                <button
                  onClick={() => handleExportChart('status-chart', 'status-distribution.png')}
                  className="btn btn-ghost btn-sm btn-ripple"
                >
                  <Icon name="download" size={16} />
                </button>
              </div>
              <div className="card-body p-lg">
                {/* Interactive Bar Chart - Larger */}
                <div className="mb-lg" id="status-chart">
                  <BarChart
                    data={Object.entries(analytics.statusBreakdown).map(([status, count]) => ({
                      label: status,
                      value: count,
                      color: getStatusColor(status)
                    }))}
                    height={400}
                    animate={true}
                  />
                </div>

                {/* Enhanced Status Breakdown - Compact */}
                <div className="space-y-sm">
                  {Object.entries(analytics.statusBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([status, count], index) => {
                      const percentage = analytics.totalApplications > 0
                        ? Math.round((count / analytics.totalApplications) * 100)
                        : 0
                      const statusColor = getStatusColor(status)
                      return (
                      <div
                        key={status}
                        className="status-breakdown-item"
                      >
                        <div className="flex items-center justify-between gap-md mb-xs">
                          <div className="flex items-center gap-sm flex-1 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0 border border-border-light"
                              style={{ background: statusColor }}
                            />
                            <span 
                              className="font-semibold text-sm"
                              style={{ color: statusColor }}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center gap-md flex-shrink-0">
                            <div className="text-right">
                              <div className="font-bold text-base" style={{ color: statusColor }}>{count}</div>
                              <div className="text-xs text-secondary font-medium">{percentage}%</div>
                            </div>
                          </div>
                        </div>
                        {/* Enhanced Progress Bar */}
                        <div className="w-full h-4 bg-background-light rounded-full overflow-hidden relative border border-border-light">
                          <div
                            className="h-full transition-all duration-1000 ease-out rounded-full relative flex items-center"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${statusColor}, ${statusColor}dd)`,
                              transitionDelay: `${index * 100}ms`,
                              minWidth: percentage > 0 ? '24px' : '0',
                              boxShadow: `0 2px 4px ${statusColor}40`
                            }}
                          >
                            {percentage > 10 && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white px-1 whitespace-nowrap">
                                {percentage}%
                              </span>
                            )}
                          </div>
                          {percentage <= 10 && percentage > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold whitespace-nowrap" style={{ color: statusColor }}>
                              {percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    )})}
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="card hover-lift animate-fade-in-scale">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-sm">
                  <Icon name="trending-up" size={20} />
                  Application Trends
                </h3>
                <button
                  onClick={() => handleExportChart('trend-chart', 'application-trends.png')}
                  className="btn btn-ghost btn-sm btn-ripple"
                >
                  <Icon name="download" size={16} />
                </button>
              </div>
              <div className="card-body p-lg">
                {/* Interactive Monthly Line Chart */}
                <div className="mb-lg" id="trend-chart">
                  <LineChart
                    data={analytics.monthlyTrend.map(month => ({
                      label: month.month,
                      value: month.count,
                      color: month.count > 0 ? 'var(--primary-orange)' : 'var(--background-light)'
                    }))}
                    height={400}
                    animate={true}
                  />
                </div>

                {/* Enhanced Monthly Summary - Compact */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-sm">
                  {analytics.monthlyTrend.slice(-6).map((month, index) => {
                    const maxCount = Math.max(...analytics.monthlyTrend.map(m => m.count), 1)
                    const percentage = maxCount > 0 ? (month.count / maxCount) * 100 : 0
                    return (
                      <div
                        key={month.month}
                        className="text-center p-sm bg-background-light rounded-lg"
                      >
                        <div className="text-lg font-bold text-primary mb-1">{month.count}</div>
                        <div className="text-secondary text-xs font-medium truncate">{month.month}</div>
                        <div className="w-full h-1 bg-background-white rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-orange to-primary-orange-light transition-all duration-1000 ease-out"
                            style={{
                              width: `${percentage}%`,
                              transitionDelay: `${index * 50}ms`
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Trend Insights */}
                <div className="mt-lg p-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-sm">
                    <Icon name="trending-up" size={20} className="text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Trend Analysis</div>
                      <div className="text-blue-700 text-sm">
                        {analytics.monthlyTrend.slice(-3).reduce((sum, month) => sum + month.count, 0) >
                         analytics.monthlyTrend.slice(-6, -3).reduce((sum, month) => sum + month.count, 0)
                          ? 'Your application activity is increasing! 📈'
                          : 'Consider increasing your application volume to improve opportunities.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
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

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2xl">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Key Insights</h3>
              </div>
              <div className="card-body space-y-md">
                <div className="p-md bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-sm">
                    <Icon name="info" size={20} className="text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Response Rate</div>
                      <div className="text-blue-700 text-sm">
                        {analytics.responseRate}% of your applications received a response
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-md bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-sm">
                    <Icon name="offer" size={20} className="text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-900">Success Rate</div>
                      <div className="text-green-700 text-sm">
                        {analytics.statusBreakdown['Offer'] || 0} offers from {analytics.totalApplications} applications
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recommendations</h3>
              </div>
              <div className="card-body space-y-md">
                {analytics.responseRate < 30 && (
                  <div className="p-md bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-sm">
                      <Icon name="warning" size={20} className="text-yellow-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-900">Low Response Rate</div>
                        <div className="text-yellow-700 text-sm">
                          Consider improving your application materials or targeting different companies
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analytics.visaSponsorshipRate < 50 && (
                  <div className="p-md bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-sm">
                      <Icon name="settings" size={20} className="text-purple-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-purple-900">Visa Sponsorship Focus</div>
                        <div className="text-purple-700 text-sm">
                          Consider applying to more companies that sponsor visas
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analytics.totalApplications < 10 && (
                  <div className="p-md bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-sm">
                      <Icon name="add" size={20} className="text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900">Build Your Pipeline</div>
                        <div className="text-blue-700 text-sm">
                          Keep applying! More applications increase your chances of success
                        </div>
                      </div>
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