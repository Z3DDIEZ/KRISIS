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
    const patternClasses = {
        featured: 'grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-spacing-lg',
        analytics: 'grid grid-cols-1 md:grid-cols-12 gap-spacing-md',
        mixed: 'asymmetric-grid asymmetric-grid--mixed'
    };

    return (
        <div className={`${patternClasses[pattern]} ${className}`}>
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
        small: 'md:col-span-3',
        medium: 'md:col-span-6',
        large: 'md:col-span-8',
        full: 'md:col-span-12'
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            {children}
        </div>
    );
};
