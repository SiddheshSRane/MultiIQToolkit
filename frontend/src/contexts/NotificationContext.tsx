
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    description?: string;
    duration?: number;
}

interface NotificationContextType {
    notify: (type: NotificationType, message: string, description?: string, duration?: number) => string;
    dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const lastNotificationRef = React.useRef<{ signature: string; timestamp: number } | null>(null);

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const notify = useCallback((type: NotificationType, message: string, description?: string, duration = 5000) => {
        // Deduplication Logic
        const signature = `${type}:${message}`;
        const now = Date.now();

        if (lastNotificationRef.current &&
            lastNotificationRef.current.signature === signature &&
            now - lastNotificationRef.current.timestamp < 1000) {
            // Duplicate detected within 1s, ignore
            return "";
        }

        lastNotificationRef.current = { signature, timestamp: now };

        const id = Math.random().toString(36).substr(2, 9);
        const newNotification: Notification = { id, type, message, description, duration };

        setNotifications((prev) => [newNotification, ...prev]);

        if (type !== 'loading') {
            setTimeout(() => dismiss(id), duration);
        }

        return id;
    }, [dismiss]);

    const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="notification-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`notification-card ${n.type}`}>
                        <div className="notification-icon">
                            {n.type === 'success' && <CheckCircle size={20} />}
                            {n.type === 'error' && <AlertCircle size={20} />}
                            {n.type === 'info' && <Info size={20} />}
                            {n.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
                        </div>
                        <div className="notification-content">
                            <div className="notification-message">{n.message}</div>
                            {n.description && <div className="notification-description">{n.description}</div>}
                        </div>
                        <button className="notification-close" onClick={() => dismiss(n.id)}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
