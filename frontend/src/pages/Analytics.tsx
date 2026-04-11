import { useState, useEffect, useMemo } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { getDocs, collection, query, orderBy } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import Icon from '../components/ui/Icon'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import StatCard from '../components/ui/StatCard'

import { handleError } from '../lib/ErrorHandler'
import { parseApplicationRecord } from '../lib/schemas'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  visaSponsorship: boolean
}

interface AnalyticsData {
  totalApplications: number
  statusBreakdown: Array<{ name: string; value: number; color: string }>
  monthlyTrend: Array<{ name: string; count: number }>
  topCompanies: Array<{ name: string; count: number }>
  roleBreakdown: Array<{ name: string; count: number }>
  visaBreakdown: Array<{ name: string; value: number; color: string }>
  funnelData: Array<{ name: string; value: number }>
  statusTrend: Array<{ name: string; [key: string]: number | string }>
  performanceMetrics: {
    avgPerWeek: number
    interviewRate: number
    offerRate: number
  }
  responseRate: number
  visaSponsorshipRate: number
}

const statusColors: Record<string, string> = {
  Applied: '#3B82F6', // blue-500
  'Phone Screen': '#8B5CF6', // violet-500
  'Technical Interview': '#F59E0B', // amber-500
  'Final Round': '#EA580C', // primary-600
  Offer: '#10B981', // emerald-500
  Rejected: '#71717A', // zinc-500
}

/**
 * Analytics page showing application performance, trends, and conversion metrics.
 * @returns The analytics page.
 */
function Analytics() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [excludedInvalidDates, setExcludedInvalidDates] = useState(0)
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'all' | '6months' | '3months' | '1month'
  >('all')

  useEffect(() => {
    if (!user) {
      if (!loading) setIsLoading(false)
      return
    }

    const loadAnalyticsData = async () => {
      try {
        const q = query(
          collection(db, `users/${user.uid}/applications`),
          orderBy('dateApplied', 'desc')
        )

        // H2U Pattern: Parallel async orchestration
        const [querySnapshot] = await Promise.all([
          getDocs(q),
          new Promise((resolve) => setTimeout(resolve, 400)), // Mimic report generation baseline
        ])

        let invalidDateCount = 0
        const apps: Application[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const parsed = parseApplicationRecord(data)
          if (!parsed.success) {
            console.warn('Invalid application record', doc.id, parsed.error.flatten())
            return
          }
          const appliedAt = new Date(parsed.data.dateApplied)
          if (Number.isNaN(appliedAt.getTime())) {
            invalidDateCount += 1
            return
          }
          apps.push({
            id: doc.id,
            company: parsed.data.company,
            role: parsed.data.role,
            dateApplied: parsed.data.dateApplied,
            status: parsed.data.status,
            visaSponsorship: parsed.data.visaSponsorship,
          })
        })
        setApplications(apps)
        setExcludedInvalidDates(invalidDateCount)
      } catch (error) {
        handleError(error, 'Analytics Load')
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalyticsData()
  }, [user, loading])

  const analyticsData = useMemo((): AnalyticsData | null => {
    if (applications.length === 0) return null

    const now = new Date()
    let filteredApps = applications

    if (selectedTimeframe !== 'all') {
      const months = selectedTimeframe === '6months' ? 6 : selectedTimeframe === '3months' ? 3 : 1
      const cutoff = new Date()
      cutoff.setMonth(now.getMonth() - months)
      filteredApps = applications.filter((app) => new Date(app.dateApplied) >= cutoff)
    }

    // Status breakdown
    const breakdownMap: Record<string, number> = {}
    filteredApps.forEach((app) => {
      breakdownMap[app.status] = (breakdownMap[app.status] || 0) + 1
    })
    const statusBreakdown = Object.entries(breakdownMap)
      .map(([name, value]) => ({
        name,
        value,
        color: statusColors[name] || 'var(--gray-400)',
      }))
      .sort((a, b) => b.value - a.value)

    // Role Breakdown
    const roleMap: Record<string, number> = {}
    filteredApps.forEach((app) => {
      const role = app.role || 'Unspecified'
      roleMap[role] = (roleMap[role] || 0) + 1
    })
    const roleBreakdown = Object.entries(roleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    // Visa Breakdown
    const visaMap = { Required: 0, Standard: 0 }
    filteredApps.forEach((app) => {
      if (app.visaSponsorship) visaMap['Required']++
      else visaMap['Standard']++
    })
    const visaBreakdown = Object.entries(visaMap).map(([name, value]) => ({
      name,
      value,
      color: name === 'Required' ? 'var(--primary-500)' : 'var(--gray-200)',
    }))

    // Monthly trend & Status Trend
    const trendMap: Record<string, number> = {}
    const statusTrendMap: Record<string, Record<string, number>> = {}

    const monthsToShow = 6
    const last6Months = Array.from({ length: monthsToShow }).map((_, i) => {
      const d = new Date()
      d.setMonth(now.getMonth() - (monthsToShow - 1 - i))
      return d.toLocaleDateString('en-US', { month: 'short' })
    })

    last6Months.forEach((m) => {
      trendMap[m] = 0
      statusTrendMap[m] = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 }
    })

    applications.forEach((app) => {
      const m = new Date(app.dateApplied).toLocaleDateString('en-US', { month: 'short' })
      if (statusTrendMap[m] !== undefined) {
        trendMap[m]++
        const statusGroup = ['Phone Screen', 'Technical Interview', 'Final Round'].includes(
          app.status
        )
          ? 'Interview'
          : app.status === 'Offer'
            ? 'Offer'
            : app.status === 'Rejected'
              ? 'Rejected'
              : 'Applied'
        statusTrendMap[m][statusGroup]++
      }
    })

    const monthlyTrend = Object.entries(trendMap).map(([name, count]) => ({ name, count }))
    const statusTrend = Object.entries(statusTrendMap).map(([name, counts]) => ({
      name,
      ...counts,
    }))

    // Conversion Funnel Data
    const funnelMap = {
      'Total Volume': filteredApps.length,
      Interviews: filteredApps.filter((a) =>
        ['Phone Screen', 'Technical Interview', 'Final Round', 'Offer'].includes(a.status)
      ).length,
      'Final Rounds': filteredApps.filter((a) => ['Final Round', 'Offer'].includes(a.status))
        .length,
      Offers: filteredApps.filter((a) => a.status === 'Offer').length,
    }
    const funnelData = Object.entries(funnelMap).map(([name, value]) => ({ name, value }))

    // Performance Metrics
    const weeksInTimeframe =
      selectedTimeframe === 'all'
        ? 24
        : selectedTimeframe === '6months'
          ? 24
          : selectedTimeframe === '3months'
            ? 12
            : 4
    const performanceMetrics = {
      avgPerWeek: Number((filteredApps.length / weeksInTimeframe).toFixed(1)),
      interviewRate:
        filteredApps.length > 0
          ? Math.round((funnelMap['Interviews'] / filteredApps.length) * 100)
          : 0,
      offerRate:
        funnelMap['Interviews'] > 0
          ? Math.round((funnelMap['Offers'] / funnelMap['Interviews']) * 100)
          : 0,
    }

    // Top Companies
    const companyMap: Record<string, number> = {}
    filteredApps.forEach((app) => {
      companyMap[app.company] = (companyMap[app.company] || 0) + 1
    })
    const topCompanies = Object.entries(companyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const responseRate =
      filteredApps.length > 0
        ? Math.round(
            (filteredApps.filter((a) => a.status !== 'Applied').length / filteredApps.length) * 100
          )
        : 0

    const visaSponsorshipRate =
      filteredApps.length > 0
        ? Math.round(
            (filteredApps.filter((a) => a.visaSponsorship).length / filteredApps.length) * 100
          )
        : 0

    return {
      totalApplications: filteredApps.length,
      statusBreakdown,
      monthlyTrend,
      topCompanies,
      roleBreakdown,
      visaBreakdown,
      funnelData,
      statusTrend,
      performanceMetrics,
      responseRate,
      visaSponsorshipRate,
    }
  }, [applications, selectedTimeframe])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Please sign in to view your analytics.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in w-full pb-16 max-w-7xl mx-auto px-6 sm:px-8 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
        <header>
          <h1 className="heading-xl text-text-primary">Analytics</h1>
          <p className="text-text-muted text-lg">Track your application performance and stats.</p>
          {excludedInvalidDates > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-sm text-text-muted max-w-xl">
              <Icon name="info" size={18} className="text-text-muted shrink-0 mt-0.5" />
              <span>
                {excludedInvalidDates} record{excludedInvalidDates === 1 ? '' : 's'} excluded due
                to invalid dates.
              </span>
            </div>
          )}
        </header>

        {/* Modern Timeframe Switcher & Export */}
        <div className="flex items-center gap-6">
          <button
            onClick={async () => {
              const { exportIntelligenceReport } = await import('../lib/ReportExporter')
              exportIntelligenceReport(applications, analyticsData!, selectedTimeframe)
            }}
            className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 px-4 py-2 transition-colors"
          >
            <Icon name="download" size={18} />
            Export Data
          </button>

          <div className="flex bg-bg-subtle p-1.5 rounded-xl border border-border shadow-inner">
            {[
              { id: 'all', label: 'All Time' },
              { id: '6months', label: '6M' },
              { id: '3months', label: '3M' },
              { id: '1month', label: '1M' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  setSelectedTimeframe(t.id as 'all' | '6months' | '3months' | '1month')
                }
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${selectedTimeframe === t.id ? 'bg-bg-surface shadow-sm text-primary-600' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!analyticsData ? (
        <Card className="p-32 text-center">
          <div className="w-20 h-20 bg-bg-subtle rounded-3xl flex items-center justify-center mx-auto mb-8 text-text-muted shadow-inner">
            <Icon name="pie-chart" size={40} />
          </div>
          <h3 className="heading-lg text-text-primary mb-3">Not Enough Data</h3>
          <p className="text-text-muted max-w-sm mx-auto text-lg leading-relaxed">
            Start tracking applications to see your insights here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-12">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Total Applications',
                value: analyticsData.totalApplications,
                icon: 'work',
                trend: 'neutral',
              },
              {
                label: 'Interview Rate',
                value: `${analyticsData.performanceMetrics.interviewRate}%`,
                icon: 'bolt',
                trend: 'up',
              },
              {
                label: 'Success Rate',
                value: `${analyticsData.performanceMetrics.offerRate}%`,
                icon: 'check',
                trend: 'up',
              },
              {
                label: 'Apps per Week',
                value: analyticsData.performanceMetrics.avgPerWeek,
                icon: 'trending-up',
                trend: 'neutral',
              },
            ].map((stat, i) => (
              <StatCard
                key={i}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend as 'up' | 'down' | 'neutral'}
              />
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Conversion Funnel */}
            <Card className="lg:col-span-2 h-[500px] flex flex-col p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Icon name="bolt" size={18} className="text-primary-600" />
                  Application Funnel
                </h3>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.funnelData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-subtle)' }}
                      contentStyle={{
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                      }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                      {analyticsData.funnelData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? '#D4D4D8' // zinc-300
                              : index === 1
                                ? '#3B82F6' // blue-500
                                : index === 2
                                  ? '#F59E0B' // amber-500
                                  : '#10B981' // emerald-500
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Context Cards */}
            <div className="flex flex-col gap-10 lg:col-span-1">
              {/* Visa Breakdown */}
              <Card className="flex-1 flex flex-col p-10 overflow-hidden">
                <h3 className="text-sm font-semibold text-text-primary mb-6">Visa Requirements</h3>
                <div className="flex-1 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.visaBreakdown}
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {analyticsData.visaBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none translate-y-2">
                    <span className="text-3xl font-semibold text-text-primary leading-none tracking-tight">
                      {analyticsData.visaSponsorshipRate}%
                    </span>
                    <span className="text-xs font-semibold text-text-muted mt-2 ml-1">Visa</span>
                  </div>
                </div>
              </Card>

              {/* Roles */}
              <Card className="flex-1 p-10">
                <h3 className="text-sm font-semibold text-text-primary mb-6">Top Roles</h3>
                <div className="space-y-5">
                  {analyticsData.roleBreakdown.slice(0, 3).map((role, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-xs font-semibold text-text-muted truncate mr-4">
                        {role.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 bg-bg-subtle rounded-full w-24 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-primary-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                            style={{
                              width: `${(role.count / analyticsData.totalApplications) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-text-primary w-6 text-right">
                          {role.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Trends Chart */}
          <Card className="h-[500px] flex flex-col p-10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-3">
                <Icon name="trending-up" size={18} className="text-primary-600" />
                Pipeline Velocity
              </h3>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData.statusTrend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-subtle)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: 'var(--text-secondary)',
                      letterSpacing: '0.05em',
                    }}
                    dy={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)' }}
                    dx={-12}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      borderRadius: '16px',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'none',
                      letterSpacing: '0.04em',
                      paddingBottom: 40,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Applied"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="Interview"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="Offer"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="Rejected"
                    stackId="1"
                    stroke="var(--error)"
                    fill="var(--error)"
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Top Companies */}
            <Card className="lg:col-span-1 p-8">
              <h3 className="text-sm font-semibold text-text-primary mb-8">Targeted Entities</h3>
              <div className="space-y-4">
                {analyticsData.topCompanies.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center group p-4 rounded-xl hover:bg-bg-subtle transition-all duration-300 border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-bg-subtle flex items-center justify-center text-xs font-semibold text-text-muted shadow-sm">
                        0{i + 1}
                      </div>
                      <span className="text-sm font-bold text-text-secondary">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-primary-700 bg-primary-100/70 dark:bg-primary-900/30 dark:text-primary-300 px-3 py-1.5 rounded-lg shadow-sm">
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Insights / Recommendations - Professional Style */}
            <Card className="lg:col-span-2 p-12 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                <Icon name="bolt" size={140} className="text-primary-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 shadow-sm">
                    <Icon name="lightbulb" size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">Intelligence Feed</h3>
                </div>

                <h4 className="text-2xl font-medium text-text-secondary mb-10 leading-relaxed max-w-2xl">
                  {analyticsData.responseRate > 40
                    ? 'Your conversion funnel is performing at high velocity. Prioritize deep preparation for late-stage technical rounds and focus on high-impact offer negotiations.'
                    : 'System signals show lower than optimal engagement. We recommend strategic resume recalibration focused on core keyword density for high-demand roles.'}
                </h4>

                <div className="flex gap-4">
                  <Button
                    onClick={async () => {
                      const { exportIntelligenceReport } = await import('../lib/ReportExporter')
                      exportIntelligenceReport(applications, analyticsData!, selectedTimeframe)
                    }}
                    variant="primary"
                    className="flex items-center gap-3 px-8 shadow-xl"
                  >
                    <Icon name="download" size={18} />
                    Download Intelligence Report
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
