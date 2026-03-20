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

/**
 * StatCard - Compact KPI summary card with optional trend and insight.
 * @param props - Metric label, value, and optional trend metadata.
 * @returns A styled stat card suitable for dashboards.
 */
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
    <Card className={`group relative p-6 flex flex-col h-full border-l-4 ${isUrgent ? 'border-l-error' : 'border-l-primary-500'} ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <span className="eyebrow text-text-secondary">{label}</span>
        <div
          className={`${isUrgent ? 'text-error bg-error/10' : 'text-primary-600 bg-primary-500/10'} p-2 rounded-lg border border-current/40 transition-transform group-hover:scale-105`}
        >
          <Icon name={isUrgent ? 'warning' : icon} size={20} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight tabular-nums leading-none">{value}</div>
        {isUrgent && (
          <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_10px_rgba(220,38,36,0.5)]" title="Action Required" />
        )}
      </div>

      <div className="mt-auto space-y-3 pt-4 border-t border-border">
        {change && (
          <div
            className={`text-xs font-semibold flex items-center gap-1.5 ${
              trend === 'up'
                ? 'text-success'
                : trend === 'down'
                  ? 'text-error'
                  : 'text-text-muted'
            }`}
          >
            {trend === 'up' && <Icon name="trending-up" size={14} />}
            {trend === 'down' && <Icon name="trending-down" size={14} />}
            <span>{change}</span>
          </div>
        )}

        {insight && (
          <div className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-text-muted" />
            <span>{insight}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default React.memo(StatCard)
