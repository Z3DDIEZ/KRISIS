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
        <div className="premium-card overflow-hidden">
            <div className="px-6 py-4 bg-red-50/50 dark:bg-red-900/10 border-b border-border-subtle flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Needs Attention</h3>
                </div>
                <span className="text-xs font-medium text-text-secondary">{actions.length} items to update</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-bg-subtle/50 text-xs text-text-secondary font-semibold">
                            <th className="px-6 py-3 w-16 text-center">Priority</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 min-w-[300px]">Description</th>
                            <th className="px-6 py-3 text-right">Age</th>
                            <th className="px-6 py-3 text-right w-32">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {actions.map((item) => (
                            <tr key={item.id} className="hover:bg-bg-subtle transition-colors group">
                                <td className="px-6 py-4 text-center">
                                    <div className={`p-1.5 rounded-lg inline-flex items-center justify-center ${item.priority === 'high' ? 'bg-red-100 text-red-600' :
                                        item.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Icon name={item.priority === 'high' ? 'warning' : 'bolt'} size={16} />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-bg-subtle text-text-primary'
                                        }`}>
                                        {item.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-text-primary group-hover:text-primary-600 transition-colors">{item.description}</span>
                                        <span className="text-xs text-text-secondary mt-0.5">{item.impact.replace('Risk: ', '')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-medium text-text-primary">{item.daysAged} days</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`/applications/${item.appId}`}
                                        className="btn-primary text-xs py-1.5 px-3"
                                    >
                                        View
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
