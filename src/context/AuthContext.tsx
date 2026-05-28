import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User, Employee } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  login: (token: string, user: User, employee?: Employee | null) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ems_token'));
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse user and employee details from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('ems_user');
    const savedEmployee = localStorage.getItem('ems_employee');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedEmployee) {
      setEmployee(JSON.parse(savedEmployee));
    }

    if (token) {
      // Configure global default header for all axios operations!
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifySession(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifySession = async (currToken: string) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${currToken}`;
      const response = await axios.get('/api/auth/profile');
      if (response.data?.success) {
        setUser(response.data.user);
        setEmployee(response.data.employee || null);
        localStorage.setItem('ems_user', JSON.stringify(response.data.user));
        if (response.data.employee) {
          localStorage.setItem('ems_employee', JSON.stringify(response.data.employee));
        } else {
          localStorage.removeItem('ems_employee');
        }
      }
    } catch (error) {
      console.error('Session validation failed. Clearing state:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User, newEmployee?: Employee | null) => {
    localStorage.setItem('ems_token', newToken);
    localStorage.setItem('ems_user', JSON.stringify(newUser));
    if (newEmployee) {
      localStorage.setItem('ems_employee', JSON.stringify(newEmployee));
    } else {
      localStorage.removeItem('ems_employee');
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    setEmployee(newEmployee || null);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    localStorage.removeItem('ems_employee');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setEmployee(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (token) {
      await verifySession(token);
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, user, employee, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be executed within an AuthProvider wrapper.');
  }
  return context;
}
