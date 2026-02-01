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
    <div className="animate-fade-in w-full pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-0">
        <header className="page-header">
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase page-header__title">Intelligence</h1>
          <p className="text-secondary font-medium tracking-tight page-header__subtitle">Quantifying your pursuit of excellence</p>
        </header>

        {/* Modern Timeframe Switcher & Export */}
        <div className="flex items-center gap-spacing-3">
          <button
            onClick={() => exportIntelligenceReport(applications, analyticsData!, selectedTimeframe)}
            className="btn btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2"
          >
            <Icon name="download" size={14} />
            Export Intel
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
        <div className="bg-surface-1 border border-dashed border-border-medium rounded-xl p-20 text-center shadow-card">
          <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-6 text-muted">
            <Icon name="pie-chart" size={32} />
          </div>
          <h3 className="text-lg font-black text-primary mb-2 uppercase">Insufficient Intelligence Data</h3>
          <p className="text-secondary max-w-xs mx-auto font-medium">Start tracking applications to generate architectural insights.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-spacing-4">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-spacing-3">
            {[
              { label: 'Pipeline Volume', value: analyticsData.totalApplications, icon: 'work', trend: 'neutral' },
              { label: 'Interview Velocity', value: `${analyticsData.performanceMetrics.interviewRate}%`, icon: 'bolt', trend: 'up' },
              { label: 'Success Quotient', value: `${analyticsData.performanceMetrics.offerRate}%`, icon: 'check', trend: 'up' },
              { label: 'Weekly Intensity', value: analyticsData.performanceMetrics.avgPerWeek, icon: 'trending-up', trend: 'neutral' }
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

          {/* Core Analytics V3 - Conversion Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-4">
            {/* Conversion Funnel */}
            <div className="card lg:col-span-2 h-[450px] flex flex-col p-spacing-4">
              <div className="flex justify-between items-center mb-spacing-5">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Icon name="bolt" size={16} className="text-primary-500" />
                  Conversion Pipeline Funnel
                </h3>
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Protocol V3.0</span>
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
                      tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-secondary)' }}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--surface-2)' }}
                      contentStyle={{ background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                      {analyticsData.funnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--gray-200)' : index === 1 ? 'var(--info)' : index === 2 ? 'var(--warning)' : 'var(--success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Residency & Role Context */}
            <div className="flex flex-col gap-spacing-4 lg:col-span-1">
              {/* Residency Distribution */}
              <div className="card flex-1 flex flex-col p-spacing-4 overflow-hidden">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-spacing-3">Residency Matrix</h3>
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
                      <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-primary leading-none">{analyticsData.visaSponsorshipRate}%</span>
                    <span className="text-[8px] font-black text-muted uppercase tracking-tighter">Sponsor</span>
                  </div>
                </div>
              </div>

              {/* Top Roles */}
              <div className="card flex-1 p-spacing-4">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-spacing-3">Target Sectors</h3>
                <div className="space-y-3">
                  {analyticsData.roleBreakdown.slice(0, 3).map((role, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-[11px] font-bold text-secondary truncate mr-2">{role.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-gray-100 rounded-full w-20 overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${(role.count / analyticsData.totalApplications) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-primary w-4">{role.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Temporal Status Segmentation */}
          <div className="card h-[450px] flex flex-col p-spacing-4">
            <div className="flex justify-between items-center mb-spacing-5">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <Icon name="trending-up" size={16} className="text-primary-500" />
                Temporal Status Architecture
              </h3>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.statusTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-muted)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-muted)' }}
                  />
                  <Tooltip contentStyle={{ background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '11px', fontWeight: 700 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 20 }} />
                  <Area type="monotone" dataKey="Applied" stackId="1" stroke="var(--info)" fill="var(--info)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Interview" stackId="1" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Offer" stackId="1" stroke="var(--success)" fill="var(--success)" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Rejected" stackId="1" stroke="var(--error)" fill="var(--error)" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Companies List */}
            <div className="lg:col-span-1 card">
              <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-8">Target Networks</h3>
              <div className="space-y-6">
                {analyticsData.topCompanies.map((c, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-surface-2 flex items-center justify-center text-[10px] font-black text-muted group-hover:bg-primary-500 group-hover:text-white transition-all">0{i + 1}</div>
                      <span className="text-sm font-bold text-primary">{c.name}</span>
                    </div>
                    <span className="text-xs font-black text-primary bg-surface-3 px-3 py-1 rounded-full">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="lg:col-span-2 bg-surface-contrast rounded-lg p-10 shadow-elevated relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon name="bolt" size={120} className="text-primary-500" />
              </div>
              <div className="relative z-10">
                <h3 className="text-primary-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Strategic Protocol</h3>
                <h4 className="text-2xl font-black text-on-contrast mb-8 leading-tight">
                  {analyticsData.responseRate > 40
                    ? "High-Performance Vector Detected. Maintain current material strategy and scale outreach volume."
                    : "Optimization Required. Velocity below benchmark. Analyze resume-market fit and refine your narrative."}
                </h4>
                <div className="flex gap-4">
                  <button className="bg-primary-500 hover:bg-primary-600 text-on-contrast px-8 py-3 rounded font-black text-[10px] uppercase tracking-widest transition-all">
                    Download Audit
                  </button>
                  <button className="bg-transparent border border-border-medium hover:border-surface-contrast text-on-contrast px-8 py-3 rounded font-black text-[10px] uppercase tracking-widest transition-all">
                    View Benchmarks
                  </button>
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