import React, { createContext, useContext, useState, useEffect } from 'react';
import { config } from '@/config';

interface User {
  _id: string;
  email: string;
  role: 'admin' | 'agent';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Auto-logout after inactivity (milliseconds). Default: 30 minutes
  const INACTIVITY_TIMEOUT = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT) || (30 * 60 * 1000);

  const apiBase = config.apiUrl;

  useEffect(() => {
    // Check for stored token on app start
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Inactivity tracking: persist last active timestamp in sessionStorage so refreshes don't reset timer
  useEffect(() => {
    if (!token) return; // only start when authenticated

    const LAST_KEY = 'smgts_last_activity';

    function updateActivity() {
      try { sessionStorage.setItem(LAST_KEY, String(Date.now())); } catch (e) {}
    }

    // initialize
    const last = Number(sessionStorage.getItem(LAST_KEY) || Date.now());
    sessionStorage.setItem(LAST_KEY, String(last));

    // check loop
    let interval = window.setInterval(() => {
      const lastSeen = Number(sessionStorage.getItem(LAST_KEY) || Date.now());
      if (Date.now() - lastSeen > INACTIVITY_TIMEOUT) {
        // perform logout
        logout();
        window.clearInterval(interval);
      }
    }, 5 * 1000); // check every 5s

    // activity listeners
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, updateActivity));

    return () => {
      window.clearInterval(interval);
      events.forEach(ev => window.removeEventListener(ev, updateActivity));
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      setToken(data.token);
      setUser(data.user);
      
      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
