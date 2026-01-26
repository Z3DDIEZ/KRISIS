import React from 'react';
import Icon from './Icon';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    change,
    trend,
    className = ''
}) => {
    return (
        <div className={`stat-card ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="stat-label">{label}</span>
                <div className="text-primary-500">
                    <Icon name={icon} size={24} />
                </div>
            </div>
            <div className="stat-value mb-2">{value}</div>
            {change && (
                <div className={`text-xs font-medium flex items-center gap-1 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-text-secondary'
                    }`}>
                    {trend === 'up' && <Icon name="trending-up" size={14} />}
                    {trend === 'down' && <Icon name="trending-down" size={14} />}
                    {change}
                </div>
            )}
        </div>
    );
};

export default React.memo(StatCard);
