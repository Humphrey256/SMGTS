import React, { createContext, useContext, useState } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  createdAt: number;
  read?: boolean;
}

const NotificationsContext = createContext<any>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<AppNotification[]>([]);

  function push(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    const n: AppNotification = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      createdAt: Date.now(),
      read: false,
      ...notification,
    };
    setItems(prev => [n, ...prev]);
    return n;
  }

  function markRead(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  }

  function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <NotificationsContext.Provider value={{ items, push, markRead, remove }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  return useContext(NotificationsContext);
}
