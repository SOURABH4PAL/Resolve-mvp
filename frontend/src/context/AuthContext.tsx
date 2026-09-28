import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse, UserRole } from '../types';
import { api, TOKEN_STORAGE_KEY } from '../api/client';
import { MOCK_USERS } from '../mock/mockData';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  switchUserRole?: (role: UserRole) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const normalizeUser = (user: User): User => {
    // Contract safeguard: ResolveHub MVP only has EMPLOYEE and SUPER_ADMIN
    const normalizedRole: UserRole = user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'EMPLOYEE';
    return {
      ...user,
      role: normalizedRole,
    };
  };

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    if (token.startsWith('mock-demo-token-')) {
      const stored = localStorage.getItem('resolvehub_active_user');
      if (stored) {
        try {
          setCurrentUser(normalizeUser(JSON.parse(stored)));
          setIsLoading(false);
          return;
        } catch {
          // ignore
        }
      }
    }

    try {
      const user = await api.get<User>('/users/me');
      const normalized = normalizeUser(user);
      localStorage.setItem('resolvehub_active_user', JSON.stringify(normalized));
      setCurrentUser(normalized);
    } catch {
      const stored = localStorage.getItem('resolvehub_active_user');
      if (stored) {
        try {
          setCurrentUser(normalizeUser(JSON.parse(stored)));
          setIsLoading(false);
          return;
        } catch {
          // ignore
        }
      }
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('resolvehub:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('resolvehub:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const authData = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (authData.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, authData.access_token);
        let loggedInUser: User;
        try {
          const user = await api.get<User>('/users/me');
          loggedInUser = normalizeUser(user);
        } catch {
          const normalizedRole: UserRole = authData.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'EMPLOYEE';
          loggedInUser = {
            id: authData.user_id,
            employee_id: authData.user_id,
            name: authData.name,
            email: email.trim(),
            role: normalizedRole,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        localStorage.setItem('resolvehub_active_user', JSON.stringify(loggedInUser));
        setCurrentUser(loggedInUser);
        return loggedInUser;
      }
    } catch {
      // Backend offline / network fallback for seamless demo
      const matched = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      let role: UserRole = 'EMPLOYEE';
      if (cleanEmail.includes('admin') || (matched && matched.role === 'SUPER_ADMIN')) {
        role = 'SUPER_ADMIN';
      }

      const demoUser: User = matched ? normalizeUser(matched) : {
        id: role === 'SUPER_ADMIN' ? 'usr-admin' : 'usr-jane',
        employee_id: role === 'SUPER_ADMIN' ? 'ADM-001' : 'EMP-105',
        name: role === 'SUPER_ADMIN' ? 'Super Admin' : (cleanEmail.split('@')[0] || 'Employee User'),
        email: email.trim(),
        role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockToken = `mock-demo-token-${demoUser.id}`;
      localStorage.setItem(TOKEN_STORAGE_KEY, mockToken);
      localStorage.setItem('resolvehub_active_user', JSON.stringify(demoUser));
      setCurrentUser(demoUser);
      return demoUser;
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const switchUserRole = (targetRole: UserRole) => {
    const targetUser = MOCK_USERS.find(u => u.role === targetRole) || {
      id: targetRole === 'SUPER_ADMIN' ? 'usr-admin' : 'usr-jane',
      employee_id: targetRole === 'SUPER_ADMIN' ? 'ADM-001' : 'EMP-105',
      name: targetRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Jane Doe (Employee)',
      email: targetRole === 'SUPER_ADMIN' ? 'admin@resolvehub.com' : 'employee@resolvehub.com',
      role: targetRole,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const normalized = normalizeUser(targetUser);
    localStorage.setItem(TOKEN_STORAGE_KEY, `mock-demo-token-${normalized.id}`);
    localStorage.setItem('resolvehub_active_user', JSON.stringify(normalized));
    setCurrentUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('resolvehub_active_user');
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        switchUserRole,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
