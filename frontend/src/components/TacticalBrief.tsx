import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { Card } from './ui/Card'
import Icon from './ui/Icon'
import { Badge } from './ui/Badge'
import { Link } from 'react-router-dom'

interface TacticalItem {
  applicationId: string
  company: string
  role: string
  action: string
  urgency: 1 | 2 | 3 | 4 | 5
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  daysSinceActivity: number
}

interface TacticalBriefResponse {
  date: string
  items: TacticalItem[]
  totalActive: number
}

export function TacticalBrief() {
  const [brief, setBrief] = useState<TacticalBriefResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchBrief = async () => {
      try {
        const generateCheck = httpsCallable(functions, 'generateDailyTacticalBrief')
        const result = await generateCheck()
        setBrief(result.data as TacticalBriefResponse)
      } catch (err) {
        console.error('Failed to fetch tactical brief:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchBrief()
  }, [])

  if (loading)
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>
          <div className="h-16 bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>
        </div>
      </Card>
    )

  if (error || !brief || brief.items.length === 0) return null

  // Filter for high priority items only to keep dashboard clean
  const criticalItems = brief.items.filter((i) => i.urgency >= 3).slice(0, 5)

  if (criticalItems.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden border-2 border-brand-midnight shadow-md">
      <div className="p-4 bg-brand-midnight border-b-2 border-brand-midnight flex justify-between items-center">
        <div className="flex items-center gap-2 text-brand-signal">
          <Icon name="target" size={20} className="text-brand-orange" />
          <h3 className="font-black text-xs uppercase tracking-[0.3em]">Daily Strategic Brief</h3>
        </div>
        <span className="text-[10px] font-black bg-brand-orange text-brand-midnight px-2 py-1 rounded-none border border-brand-midnight uppercase tracking-widest">
          {criticalItems.length} Key Extractions
        </span>
      </div>

      <div className="divide-y-2 divide-brand-midnight/10 dark:divide-zinc-800">
        {criticalItems.map((item) => (
          <Link
            key={item.applicationId}
            to={`/applications/${item.applicationId}`}
            className="block p-5 hover:bg-brand-orange/5 dark:hover:bg-zinc-900/50 transition-colors group"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-black text-brand-midnight dark:text-white text-sm uppercase tracking-tight group-hover:text-brand-orange transition-colors">
                  {item.company}
                </span>
                <span className="text-brand-midnight/20 mx-2 text-xs">//</span>
                <span className="text-brand-midnight/50 text-xs font-black uppercase tracking-tighter">{item.role}</span>
              </div>
              <Badge
                variant={
                  item.riskLevel === 'critical'
                    ? 'error'
                    : item.riskLevel === 'high'
                      ? 'warning'
                      : 'neutral'
                }
                className="text-[9px] px-2 py-0.5 uppercase rounded-none border-2 border-current font-black tracking-widest"
              >
                {item.riskLevel === 'critical'
                  ? 'Ghosted'
                  : item.riskLevel === 'high'
                    ? 'High Risk'
                    : 'Active'}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`
                w-2 h-2 rounded-none shrink-0 border border-brand-midnight
                ${item.urgency === 5 ? 'bg-error animate-pulse' : item.urgency === 4 ? 'bg-warning' : 'bg-brand-orange'}
              `}
              ></div>
              <p className="text-xs font-bold text-brand-midnight/80 dark:text-zinc-300 line-clamp-1 italic">
                {item.action}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-brand-midnight/30 uppercase tracking-widest">
              <Icon name="clock" size={12} />
              <span>Latency: {item.daysSinceActivity} days</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
