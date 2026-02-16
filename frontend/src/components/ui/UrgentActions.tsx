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

const UrgentActions: React.FC<UrgentActionsProps> = ({ actions }) => {
  if (actions.length === 0) return null

  return (
    <Card className="overflow-hidden border-zinc-200/50 dark:border-zinc-800/50 hover:border-primary-500/10 transition-colors">
      <div className="px-6 py-5 bg-linear-to-r from-red-50/50 to-transparent dark:from-red-950/20 dark:to-transparent border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
            Critical Updates Required
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {actions.length} priorities
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/30 dark:bg-zinc-900/40 text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.15em]">
              <th className="px-6 py-4 w-16 text-center">Pri</th>
              <th className="px-6 py-4 font-black">Category</th>
              <th className="px-6 py-4 min-w-[300px] font-black">Description & Insights</th>
              <th className="px-6 py-4 text-right font-black">Age</th>
              <th className="px-6 py-4 text-right w-32 font-black">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100/50 dark:divide-zinc-800/50">
            {actions.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                <td className="px-6 py-5 text-center">
                  <div
                    className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-transform group-hover:scale-110 ${
                      item.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 shadow-sm'
                        : item.priority === 'medium'
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 shadow-sm'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 shadow-sm'
                    }`}
                  >
                    <Icon name={item.priority === 'high' ? 'warning' : 'bolt'} size={18} />
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border transition-all ${
                      item.priority === 'high'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700'
                    }`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors tracking-tight">
                      {item.description}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                      {item.impact.replace('Risk: ', '')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {item.daysAged}d
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link to={`/applications/${item.appId}`}>
                    <Button variant="primary" size="sm" className="shadow-none hover:shadow-lg">
                      Review
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
