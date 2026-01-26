import { create } from 'zustand';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface UIStore {
    notifications: Notification[];
    sidebarOpen: boolean;
    dispatchNotification: (message: string, type: Notification['type']) => void;
    dismissNotification: (id: string) => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    notifications: [],
    sidebarOpen: true,

    dispatchNotification: (message, type) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
            notifications: [...state.notifications, { id, type, message }]
        }));

        // Auto-dismiss logic
        setTimeout(() => {
            set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id)
            }));
        }, 5000);
    },

    dismissNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
