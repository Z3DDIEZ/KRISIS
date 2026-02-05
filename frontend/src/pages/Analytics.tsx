import { useState, useEffect, useMemo } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { getDocs, collection, query, orderBy } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import Icon from '../components/ui/Icon'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import { exportIntelligenceReport } from '../lib/ReportExporter'
import { handleError } from '../lib/ErrorHandler'

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
  statusTrend: Array<{ name: string;[key: string]: number | string }>
  performanceMetrics: {
    avgPerWeek: number
    interviewRate: number
    offerRate: number
  }
  responseRate: number
  visaSponsorshipRate: number
}

const statusColors: Record<string, string> = {
  'Applied': 'var(--info)',
  'Phone Screen': '#9B59B6',
  'Technical Interview': 'var(--warning)',
  'Final Round': 'var(--primary-500)',
  'Offer': 'var(--success)',
  'Rejected': 'var(--error)'
}

function Analytics() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '6months' | '3months' | '1month'>('all')

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
          new Promise(resolve => setTimeout(resolve, 400)) // Mimic report generation baseline
        ])

        const apps: Application[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          apps.push({
            id: doc.id,
            company: data.company || '',
            role: data.role || '',
            dateApplied: data.dateApplied || '',
            status: data.status || 'Applied',
            visaSponsorship: Boolean(data.visaSponsorship)
          })
        })
        setApplications(apps)
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
      filteredApps = applications.filter(app => new Date(app.dateApplied) >= cutoff)
    }

    // Status breakdown
    const breakdownMap: Record<string, number> = {}
    filteredApps.forEach(app => {
      breakdownMap[app.status] = (breakdownMap[app.status] || 0) + 1
    })
    const statusBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value,
      color: statusColors[name] || 'var(--gray-400)'
    })).sort((a, b) => b.value - a.value)

    // Role Breakdown
    const roleMap: Record<string, number> = {}
    filteredApps.forEach(app => {
      const role = app.role || 'Unspecified'
      roleMap[role] = (roleMap[role] || 0) + 1
    })
    const roleBreakdown = Object.entries(roleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    // Visa Breakdown
    const visaMap = { 'Required': 0, 'Standard': 0 }
    filteredApps.forEach(app => {
      if (app.visaSponsorship) visaMap['Required']++
      else visaMap['Standard']++
    })
    const visaBreakdown = Object.entries(visaMap).map(([name, value]) => ({
      name,
      value,
      color: name === 'Required' ? 'var(--primary-500)' : 'var(--gray-200)'
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

    last6Months.forEach(m => {
      trendMap[m] = 0
      statusTrendMap[m] = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 }
    })

    applications.forEach(app => {
      const m = new Date(app.dateApplied).toLocaleDateString('en-US', { month: 'short' })
      if (statusTrendMap[m] !== undefined) {
        trendMap[m]++
        const statusGroup = ['Phone Screen', 'Technical Interview', 'Final Round'].includes(app.status)
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
    const statusTrend = Object.entries(statusTrendMap).map(([name, counts]) => ({ name, ...counts }))

    // Conversion Funnel Data
    const funnelMap = {
      'Total Volume': filteredApps.length,
      'Interviews': filteredApps.filter(a => ['Phone Screen', 'Technical Interview', 'Final Round', 'Offer'].includes(a.status)).length,
      'Final Rounds': filteredApps.filter(a => ['Final Round', 'Offer'].includes(a.status)).length,
      'Offers': filteredApps.filter(a => a.status === 'Offer').length
    }
    const funnelData = Object.entries(funnelMap).map(([name, value]) => ({ name, value }))

    // Performance Metrics
    const weeksInTimeframe = selectedTimeframe === 'all' ? 24 : selectedTimeframe === '6months' ? 24 : selectedTimeframe === '3months' ? 12 : 4
    const performanceMetrics = {
      avgPerWeek: Number((filteredApps.length / weeksInTimeframe).toFixed(1)),
      interviewRate: filteredApps.length > 0 ? Math.round((funnelMap['Interviews'] / filteredApps.length) * 100) : 0,
      offerRate: funnelMap['Interviews'] > 0 ? Math.round((funnelMap['Offers'] / funnelMap['Interviews']) * 100) : 0
    }

    // Top Companies
    const companyMap: Record<string, number> = {}
    filteredApps.forEach(app => {
      companyMap[app.company] = (companyMap[app.company] || 0) + 1
    })
    const topCompanies = Object.entries(companyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const responseRate = filteredApps.length > 0
      ? Math.round((filteredApps.filter(a => a.status !== 'Applied').length / filteredApps.length) * 100)
      : 0

    const visaSponsorshipRate = filteredApps.length > 0
      ? Math.round((filteredApps.filter(a => a.visaSponsorship).length / filteredApps.length) * 100)
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
      visaSponsorshipRate
    }
  }, [applications, selectedTimeframe])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in w-full pb-12 max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <header className="page-header">
          <h1 className="heading-xl">Analytics</h1>
          <p className="text-text-secondary font-medium">Track your application performance and stats</p>
        </header>

        {/* Modern Timeframe Switcher & Export */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => exportIntelligenceReport(applications, analyticsData!, selectedTimeframe)}
            className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wide px-4 py-2"
          >
            <Icon name="download" size={16} />
            Export Data
          </button>

          <div className="flex bg-surface-3 p-1 rounded-lg border border-border-light">
            {[
              { id: 'all', label: 'All Time' },
              { id: '6months', label: '6M' },
              { id: '3months', label: '3M' },
              { id: '1month', label: '1M' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTimeframe(t.id as 'all' | '6months' | '3months' | '1month')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedTimeframe === t.id ? 'bg-surface-1 shadow-sm text-primary' : 'text-muted hover:text-secondary'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!analyticsData ? (
        <div className="premium-card p-20 text-center">
          <div className="w-16 h-16 bg-bg-subtle rounded-full flex items-center justify-center mx-auto mb-6 text-text-secondary">
            <Icon name="pie-chart" size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Not Enough Data</h3>
          <p className="text-text-secondary max-w-xs mx-auto font-medium">Start tracking applications to see your insights here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Applications', value: analyticsData.totalApplications, icon: 'work', trend: 'neutral' },
              { label: 'Interview Rate', value: `${analyticsData.performanceMetrics.interviewRate}%`, icon: 'bolt', trend: 'up' },
              { label: 'Success Rate', value: `${analyticsData.performanceMetrics.offerRate}%`, icon: 'check', trend: 'up' },
              { label: 'Apps per Week', value: analyticsData.performanceMetrics.avgPerWeek, icon: 'trending-up', trend: 'neutral' }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Conversion Funnel */}
            <div className="premium-card lg:col-span-2 h-[450px] flex flex-col p-8">
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
                      contentStyle={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                      {analyticsData.funnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--gray-300)' : index === 1 ? 'var(--info)' : index === 2 ? 'var(--warning)' : 'var(--success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Context Cards */}
            <div className="flex flex-col gap-8 lg:col-span-1">
              {/* Visa Breakdown */}
              <div className="premium-card flex-1 flex flex-col p-8 overflow-hidden">
                <h3 className="text-sm font-bold text-text-primary mb-4">Visa Requirements</h3>
                <div className="flex-1 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.visaBreakdown}
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.visaBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-text-primary leading-none">{analyticsData.visaSponsorshipRate}%</span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mt-1">Sponsorship</span>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="premium-card flex-1 p-8">
                <h3 className="text-sm font-bold text-text-primary mb-4">Top Roles</h3>
                <div className="space-y-3">
                  {analyticsData.roleBreakdown.slice(0, 3).map((role, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-xs font-medium text-text-secondary truncate mr-2">{role.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full w-20 overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${(role.count / analyticsData.totalApplications) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-text-primary w-4">{role.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trends Chart */}
          <div className="premium-card h-[450px] flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Icon name="trending-up" size={18} className="text-primary-600" />
                Application Activity Over Time
              </h3>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.statusTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 20 }} />
                  <Area type="monotone" dataKey="Applied" stackId="1" stroke="var(--info)" fill="var(--info)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Interview" stackId="1" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Offer" stackId="1" stroke="var(--success)" fill="var(--success)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Rejected" stackId="1" stroke="var(--error)" fill="var(--error)" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Companies */}
            <div className="lg:col-span-1 premium-card p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Top Companies</h3>
              <div className="space-y-3">
                {analyticsData.topCompanies.map((c, i) => (
                  <div key={i} className="flex justify-between items-center group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">0{i + 1}</div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights / Recommendations - Professional Style */}
            <div className="lg:col-span-2 premium-card p-8 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Icon name="bolt" size={100} className="text-primary-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                    <Icon name="lightbulb" size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">AI Recommendations</h3>
                </div>

                <h4 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 leading-relaxed max-w-2xl">
                  {analyticsData.responseRate > 40
                    ? "Your response rate is strong. Focus on interview preparation and salary negotiation tactics to maximize your conversion rate."
                    : "Response rate is below market average. We recommend refining your resume keywords and targeting roles that better match your core skills."}
                </h4>

                <div className="flex gap-4">
                  <button
                    onClick={() => exportIntelligenceReport(applications, analyticsData!, selectedTimeframe)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Icon name="download" size={16} />
                    Download Report
                  </button>
                  {/* Placeholder for future action */}
                  {/* <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      View Insights
                    </button> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics