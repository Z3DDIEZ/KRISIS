import React from 'react';

type CardSize = 'small' | 'medium' | 'large' | 'full';

interface AsymmetricGridProps {
    children: React.ReactNode;
    pattern?: 'featured' | 'analytics' | 'mixed';
    className?: string;
}

export const AsymmetricGrid: React.FC<AsymmetricGridProps> = ({
    children,
    pattern = 'mixed',
    className = ''
}) => {
    return (
        <div className={`asymmetric-grid asymmetric-grid--${pattern} ${className}`}>
            {children}
        </div>
    );
};

interface AsymmetricCardProps {
    children: React.ReactNode;
    size?: CardSize;
    className?: string;
}

export const AsymmetricCard: React.FC<AsymmetricCardProps> = ({
    children,
    size = 'medium',
    className = ''
}) => {
    const sizeClasses = {
        small: 'grid-span-3',
        medium: 'grid-span-6',
        large: 'grid-span-8',
        full: 'grid-span-12'
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            {children}
        </div>
    );
};
