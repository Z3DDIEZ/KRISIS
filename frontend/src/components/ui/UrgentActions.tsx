import React from 'react'
import Icon from './Icon'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Button } from './Button'

interface ActionItem {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: 'Follow-up' | 'Assessment' | 'Decision'
  description: string
  impact: string
  daysAged: number
  appId: string
}

interface UrgentActionsProps {
  actions: ActionItem[]
}

/**
 * UrgentActions - Prioritised action table for stale or risky applications.
 * @param props - Action items to display in the urgent list.
 * @returns A table of urgent actions, or null when empty.
 */
const UrgentActions: React.FC<UrgentActionsProps> = ({ actions }) => {
  if (actions.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 bg-error/10 text-text-primary border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Icon name="warning" size={20} className="text-error" />
          <h3 className="text-sm font-semibold tracking-wide">Critical Strategic Deviations</h3>
        </div>
        <span className="text-xs font-medium text-text-muted">{actions.length} prioritised signals</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-subtle text-xs text-text-muted font-semibold border-b border-border">
              <th className="px-6 py-4 w-16 text-center">Signal</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 min-w-[300px]">Intelligence detail</th>
              <th className="px-6 py-4 text-right">Age</th>
              <th className="px-6 py-4 text-right w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {actions.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-bg-subtle transition-colors group"
              >
                <td className="px-6 py-5 text-center">
                  <div
                    className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-transform group-hover:scale-105 ${
                      item.priority === 'high'
                        ? 'border-error text-error bg-error/5'
                        : item.priority === 'medium'
                          ? 'border-warning text-warning bg-warning/5'
                          : 'border-border text-text-primary bg-bg-subtle'
                    }`}
                  >
                    <Icon name={item.priority === 'high' ? 'warning' : 'bolt'} size={18} />
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                      item.priority === 'high'
                        ? 'bg-error/10 text-error border-error/30'
                        : 'bg-bg-surface text-text-primary border-border'
                    }`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text-primary">{item.description}</span>
                    <span className="text-sm text-text-secondary mt-1 leading-relaxed">
                      {item.impact.replace('Risk: ', '')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-sm font-semibold text-text-primary tabular-nums">
                    {item.daysAged}d
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link to={`/applications/${item.appId}`}>
                    <Button variant="primary" size="sm">
                      Intercept
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default React.memo(UrgentActions)
