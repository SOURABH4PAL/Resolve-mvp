import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse, UserRole } from '../types';
import { api, TOKEN_STORAGE_KEY } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
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

    try {
      const user = await api.get<User>('/users/me');
      setCurrentUser(normalizeUser(user));
    } catch {
      // Token expired or invalid
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
    try {
      const authData = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (authData.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, authData.access_token);
        // Retrieve full profile from /api/users/me
        let loggedInUser: User;
        try {
          const user = await api.get<User>('/users/me');
          loggedInUser = normalizeUser(user);
        } catch {
          // Fallback user object from token response
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
        setCurrentUser(loggedInUser);
        return loggedInUser;
      }
      return null;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
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
