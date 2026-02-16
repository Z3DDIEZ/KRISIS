import React from 'react'
import Icon from './Icon'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  insight?: string
  isUrgent?: boolean
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  insight,
  isUrgent,
  change,
  trend,
  className = '',
}) => {
  return (
    <Card className={`p-6 flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
        <div
          className={`${isUrgent ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'} p-2 rounded-lg`}
        >
          <Icon name={isUrgent ? 'warning' : icon} size={20} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-3xl font-black text-zinc-900 dark:text-white">{value}</div>
        {isUrgent && (
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Needs Attention" />
        )}
      </div>

      <div className="mt-auto space-y-2">
        {change && (
          <div
            className={`text-xs font-bold flex items-center gap-1 ${
              trend === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : trend === 'down'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-zinc-400'
            }`}
          >
            {trend === 'up' && <Icon name="trending-up" size={14} />}
            {trend === 'down' && <Icon name="trending-down" size={14} />}
            {change}
          </div>
        )}

        {insight && (
          <div className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-tight">
            <Icon name="info" size={14} className="opacity-70 mt-0.5 shrink-0" />
            <span>{insight}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default React.memo(StatCard)
