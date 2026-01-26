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
        <div className={`stat-card ${isUrgent ? 'stat-card--urgent' : ''} ${className}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="stat-label">{label}</span>
                <div className={`${isUrgent ? 'text-error' : 'text-primary-500'}`}>
                    <Icon name={isUrgent ? 'warning' : icon} size={isUrgent ? 20 : 24} />
                </div>
            </div>

            <div className="flex items-baseline gap-2">
                <div className="stat-value">{value}</div>
                {isUrgent && <div className="stat-urgent-indicator" title="Urgent Action Required" />}
            </div>

            {change && (
                <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-spacing-2 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-muted'
                    }`}>
                    {trend === 'up' && <Icon name="trending-up" size={10} />}
                    {trend === 'down' && <Icon name="trending-down" size={10} />}
                    {change}
                </div>
            )}

            {insight && (
                <div className="stat-insight">
                    <Icon name="info" size={12} className="opacity-50" />
                    <span>{insight}</span>
                </div>
            )}
        </div>
    );
};

export default React.memo(StatCard);
