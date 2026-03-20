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
    <Card className="overflow-hidden border-2 border-brand-midnight shadow-md">
      <div className="px-6 py-5 bg-brand-orange! text-white border-b-2 border-brand-midnight flex justify-between items-center relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Icon name="warning" size={20} className="text-brand-midnight animate-pulse" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-midnight">
            Critical Strategic Deviations
          </h3>
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-midnight">
          {actions.length} prioritized signals
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-gray/40 text-[11px] text-brand-midnight font-black uppercase tracking-[0.2em] border-b-2 border-brand-midnight/20">
              <th className="px-6 py-4 w-16 text-center">SIG</th>
              <th className="px-6 py-4 font-black">Category</th>
              <th className="px-6 py-4 min-w-[300px] font-black">Intelligence Detail</th>
              <th className="px-6 py-4 text-right font-black">Age</th>
              <th className="px-6 py-4 text-right w-32 font-black">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-brand-midnight/5">
            {actions.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-brand-orange/5 transition-colors group"
              >
                <td className="px-6 py-5 text-center">
                  <div
                    className={`w-8 h-8 rounded-none border-2 inline-flex items-center justify-center transition-transform group-hover:scale-110 ${
                      item.priority === 'high'
                        ? 'border-error text-error bg-error/5'
                        : item.priority === 'medium'
                          ? 'border-warning text-warning bg-warning/5'
                          : 'border-brand-midnight text-brand-midnight bg-brand-midnight/5'
                    }`}
                  >
                    <Icon name={item.priority === 'high' ? 'warning' : 'bolt'} size={18} />
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`text-[9px] font-black px-2.5 py-1 rounded-none uppercase tracking-widest border-2 transition-all ${
                      item.priority === 'high'
                        ? 'bg-error text-white border-brand-midnight shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                        : 'bg-brand-signal text-brand-midnight border-brand-midnight'
                    }`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-brand-midnight dark:text-zinc-100 group-hover:text-brand-orange transition-colors tracking-tight uppercase">
                      {item.description}
                    </span>
                    <span className="text-[11px] text-brand-midnight dark:text-zinc-200 mt-1 font-bold leading-relaxed italic">
                      {item.impact.replace('Risk: ', '')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-xs font-black text-brand-midnight dark:text-zinc-100 tabular-nums uppercase">
                    {item.daysAged}d
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link to={`/applications/${item.appId}`}>
                    <Button variant="primary" size="sm" className="rounded-none border-2 border-brand-midnight shadow-sm hover:shadow-md uppercase font-black text-[10px] tracking-widest">
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
