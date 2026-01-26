import React from 'react';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

/**
 * Enhanced layout wrapper that determines which pattern to use based on the route.
 * Patterns:
 * - Admin/Settings: Power Sidebar (25/75)
 * - Navigation-heavy: Anchored Nav (20/80) 
 * - Content-focused: Content-First Canvas (70/30)
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const path = location.pathname;

    // Determine layout pattern
    let pattern: 'power-sidebar' | 'anchored-nav' | 'content-canvas' = 'power-sidebar';

    if (path === '/settings' || path === '/profile') {
        pattern = 'anchored-nav';
    } else if (path.startsWith('/applications/')) {
        pattern = 'content-canvas';
    } else if (path === '/analytics') {
        pattern = 'power-sidebar'; // Power Sidebar is good for wide dashboards
    }

    return (
        <div className={`layout-pattern--${pattern}`}>
            {children}
        </div>
    );
};

export default DashboardLayout;
