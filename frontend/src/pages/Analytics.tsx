import { useState, useEffect, useMemo } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area
} from 'recharts'

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
  responseRate: number
  visaSponsorshipRate: number
}

const statusColors: Record<string, string> = {
  'Applied': '#3B82F6',
  'Phone Screen': '#8B5CF6',
  'Technical Interview': '#F59E0B',
  'Final Round': '#EC4899',
  'Offer': '#10B981',
  'Rejected': '#EF4444'
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
          visaSponsorship: Boolean(data.visaSponsorship)
        })
      })
      setApplications(apps)
      setIsLoading(false)
    }, (error) => {
      console.error('Error loading applications:', error)
      toast.error('Failed to load analytics data')
      setIsLoading(false)
    })

    return () => unsubscribe()
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

    // Status breakdown for BarChart
    const breakdownMap: Record<string, number> = {}
    filteredApps.forEach(app => {
      breakdownMap[app.status] = (breakdownMap[app.status] || 0) + 1
    })
    const statusBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value,
      color: statusColors[name] || '#94A3B8'
    })).sort((a, b) => b.value - a.value)

    // Monthly trend for AreaChart
    const trendMap: Record<string, number> = {}
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date()
      d.setMonth(now.getMonth() - (5 - i))
      return d.toLocaleDateString('en-US', { month: 'short' })
    })

    last6Months.forEach(m => trendMap[m] = 0)
    applications.forEach(app => {
      const m = new Date(app.dateApplied).toLocaleDateString('en-US', { month: 'short' })
      if (trendMap[m] !== undefined) trendMap[m]++
    })
    const monthlyTrend = Object.entries(trendMap).map(([name, count]) => ({ name, count }))

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

        {/* Modern Timeframe Switcher */}
        <div className="flex bg-surface-3 p-1 rounded-lg border border-border-light">
          {[
            { id: 'all', label: 'All Time' },
            { id: '6months', label: '6M' },
            { id: '3months', label: '3M' },
            { id: '1month', label: '1M' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTimeframe(t.id as any)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedTimeframe === t.id ? 'bg-surface-1 shadow-sm text-primary' : 'text-muted hover:text-secondary'}`}
            >
              {t.label}
            </button>
          ))}
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
        <div className="space-y-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Volume', value: analyticsData.totalApplications, icon: 'work', color: 'primary' },
              { label: 'Engagement Rate', value: `${analyticsData.responseRate}%`, icon: 'bolt', color: 'orange' },
              { label: 'Visa Velocity', value: `${analyticsData.visaSponsorshipRate}%`, icon: 'public', color: 'blue' },
              { label: 'Offer Count', value: analyticsData.statusBreakdown.find(s => s.name === 'Offer')?.value || 0, icon: 'check', color: 'success' }
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{stat.label}</span>
                  <div className={`p-2 rounded-md bg-surface-2 text-muted`}>
                    <Icon name={stat.icon} size={14} />
                  </div>
                </div>
                <div className="text-4xl font-black text-primary leading-none">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trend Analysis */}
            <div className="card h-[450px] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Icon name="trending-up" size={16} className="text-primary-500" />
                  Application Velocity
                </h3>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-muted)' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-muted)' }}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-elevated)', fontSize: '11px', fontWeight: 700 }}
                      cursor={{ stroke: 'var(--primary-500)', strokeWidth: 2, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary-500)" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="card h-[450px] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Icon name="pie-chart" size={16} className="text-primary-500" />
                  Pipeline Segmentation
                </h3>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.statusBreakdown} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-secondary)' }}
                      width={100}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--surface-2)' }}
                      contentStyle={{ background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-elevated)', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {analyticsData.statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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