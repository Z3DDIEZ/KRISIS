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

/**
 * TacticalBrief - Daily brief with high-urgency tactical signals.
 * @returns A card summarising high-priority actions for the user.
 */
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
        <div className="h-6 bg-bg-subtle rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-bg-subtle rounded-lg"></div>
          <div className="h-16 bg-bg-subtle rounded-lg"></div>
        </div>
      </Card>
    )

  if (error || !brief || brief.items.length === 0) return null

  // Filter for high priority items only to keep dashboard clean
  const criticalItems = brief.items.filter((i) => i.urgency >= 3).slice(0, 5)

  if (criticalItems.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 bg-bg-surface border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-primary">
          <Icon name="target" size={20} className="text-primary-600" />
          <h3 className="font-semibold text-sm tracking-wide">Daily strategic brief</h3>
        </div>
        <span className="text-xs font-medium bg-primary-50 text-primary-700 px-2.5 py-1 rounded-md border border-primary-100">
          {criticalItems.length} key extractions
        </span>
      </div>

      <div className="divide-y divide-border">
        {criticalItems.map((item) => (
          <Link
            key={item.applicationId}
            to={`/applications/${item.applicationId}`}
            className="block p-5 hover:bg-bg-subtle transition-colors group"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold text-text-primary text-sm group-hover:text-primary-600 transition-colors">
                  {item.company}
                </span>
                <span className="text-text-muted mx-2 text-xs">/</span>
                <span className="text-text-muted text-xs font-medium">{item.role}</span>
              </div>
              <Badge
                variant={
                  item.riskLevel === 'critical'
                    ? 'error'
                    : item.riskLevel === 'high'
                      ? 'warning'
                    : 'neutral'
                }
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
                w-2 h-2 rounded-full shrink-0 border border-border
                ${item.urgency === 5 ? 'bg-error animate-pulse' : item.urgency === 4 ? 'bg-warning' : 'bg-primary-500'}
              `}
              ></div>
              <p className="text-sm text-text-secondary line-clamp-1">
                {item.action}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-text-muted">
              <Icon name="clock" size={12} />
              <span>Latency: {item.daysSinceActivity} days</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
