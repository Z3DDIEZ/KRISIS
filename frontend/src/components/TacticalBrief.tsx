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
    <Card className="p-0 overflow-hidden border-orange-200 dark:border-orange-900/30">
      <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30 flex justify-between items-center">
        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Icon name="target" size={20} />
          <h3 className="font-bold text-sm uppercase tracking-wide">Daily Tactical Brief</h3>
        </div>
        <span className="text-xs font-bold bg-white dark:bg-zinc-900 text-orange-600 px-2 py-1 rounded-full border border-orange-200 dark:border-orange-900/30">
          {criticalItems.length} Actions Required
        </span>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {criticalItems.map((item) => (
          <Link
            key={item.applicationId}
            to={`/applications/${item.applicationId}`}
            className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <span className="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-primary-600 transition-colors">
                  {item.company}
                </span>
                <span className="text-zinc-400 mx-2 text-xs">•</span>
                <span className="text-zinc-500 text-xs">{item.role}</span>
              </div>
              <Badge
                variant={
                  item.riskLevel === 'critical'
                    ? 'error'
                    : item.riskLevel === 'high'
                      ? 'warning'
                      : 'neutral'
                }
                className="text-[10px] px-1.5 py-0.5 uppercase"
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
                w-1.5 h-1.5 rounded-full shrink-0
                ${item.urgency === 5 ? 'bg-red-500 animate-pulse' : item.urgency === 4 ? 'bg-orange-500' : 'bg-yellow-500'}
              `}
              ></div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 line-clamp-1">
                {item.action}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400">
              <Icon name="clock" size={12} />
              <span>Last activity {item.daysSinceActivity} days ago</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
