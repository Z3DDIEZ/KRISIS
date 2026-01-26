import React from 'react';
import Icon from './Icon';
import { Link } from 'react-router-dom';

interface ActionItem {
    id: string;
    priority: 'high' | 'medium' | 'low';
    category: 'Follow-up' | 'Assessment' | 'Decision';
    description: string;
    impact: string;
    daysAged: number;
    appId: string;
}

interface UrgentActionsProps {
    actions: ActionItem[];
}

const UrgentActions: React.FC<UrgentActionsProps> = ({ actions }) => {
    if (actions.length === 0) return null;

    return (
        <div className="card overflow-hidden">
            <div className="px-spacing-4 py-spacing-3 bg-surface-contrast/5 border-b border-border-light flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                    <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Urgent Protocol Actions</h3>
                </div>
                <span className="text-[10px] font-black text-muted uppercase">{actions.length} items flagged</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-2">
                            <th className="px-spacing-4 py-spacing-2 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border-light w-12 text-center">Pri</th>
                            <th className="px-spacing-4 py-spacing-2 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border-light">Category</th>
                            <th className="px-spacing-4 py-spacing-2 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border-light min-w-[300px]">Description</th>
                            <th className="px-spacing-4 py-spacing-2 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border-light text-right">Age</th>
                            <th className="px-spacing-4 py-spacing-2 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border-light text-right w-32">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        {actions.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-3 transition-colors group">
                                <td className="px-spacing-4 py-spacing-3 text-center">
                                    <div className={`p-1 rounded flex items-center justify-center ${item.priority === 'high' ? 'bg-error/10 text-error' :
                                            item.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
                                        }`}>
                                        <Icon name={item.priority === 'high' ? 'warning' : 'bolt'} size={14} />
                                    </div>
                                </td>
                                <td className="px-spacing-4 py-spacing-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.priority === 'high' ? 'bg-error text-white' : 'bg-surface-2 text-primary'
                                        }`}>
                                        {item.category}
                                    </span>
                                </td>
                                <td className="px-spacing-4 py-spacing-3">
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-primary group-hover:text-primary-500 transition-colors">{item.description}</span>
                                        <span className="text-[10px] text-muted uppercase font-black tracking-tight">{item.impact}</span>
                                    </div>
                                </td>
                                <td className="px-spacing-4 py-spacing-3 text-right">
                                    <span className="text-xs font-black text-primary">{item.daysAged}d</span>
                                </td>
                                <td className="px-spacing-4 py-spacing-3 text-right">
                                    <Link
                                        to={`/applications/${item.appId}`}
                                        className="btn btn-primary text-[9px] font-black py-1 px-3"
                                    >
                                        EXECUTE
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(UrgentActions);
