import React from 'react';
import Icon from './Icon';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    insight?: string;
    isUrgent?: boolean;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    insight,
    isUrgent,
    change,
    trend,
    className = ''
}) => {
    return (
        <div className={`p-6 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-bold text-text-secondary">{label}</span>
                <div className={`${isUrgent ? 'text-red-600 bg-red-100' : 'text-primary-600 bg-primary-100'} p-2 rounded-lg`}>
                    <Icon name={isUrgent ? 'warning' : icon} size={20} />
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
                <div className="text-3xl font-black text-text-primary">{value}</div>
                {isUrgent && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Needs Attention" />}
            </div>

            <div className="mt-auto space-y-2">
                {change && (
                    <div className={`text-xs font-bold flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-text-muted'
                        }`}>
                        {trend === 'up' && <Icon name="trending-up" size={14} />}
                        {trend === 'down' && <Icon name="trending-down" size={14} />}
                        {change}
                    </div>
                )}

                {insight && (
                    <div className="flex items-start gap-1.5 text-xs text-text-secondary leading-tight">
                        <Icon name="info" size={14} className="opacity-70 mt-0.5 shrink-0" />
                        <span>{insight}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(StatCard);
