import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  createdAt: number;
  read?: boolean;
}

const NotificationsContext = createContext<any>(null);

const STORAGE_KEY = 'smgts_notifications_v1';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AppNotification[];
      // Ensure createdAt numbers
      return parsed.map(p => ({ ...p, createdAt: Number(p.createdAt || Date.now()) }));
    } catch (e) {
      return [];
    }
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore storage errors
    }
  }, [items]);

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
