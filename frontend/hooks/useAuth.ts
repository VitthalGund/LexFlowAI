'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'COMPLIANCE_OFFICER' | 'REGIONAL_HEAD' | 'BRANCH_MANAGER' | 'IT_ENGINEER' | 'AUDITOR';
  branch_lgd_code?: string;
  language: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('lexflow_token');
    localStorage.removeItem('lexflow_user');
    setUser(null);
    router.push('/');
  }, [router]);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('lexflow_token');
    const storedUser = localStorage.getItem('lexflow_user');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        Promise.resolve().then(() => {
          setUser(parsedUser);
          setLoading(false);
        });
        return;
      } catch {
        Promise.resolve().then(() => {
          logout();
          setLoading(false);
        });
        return;
      }
    }
    Promise.resolve().then(() => {
      setLoading(false);
    });
  }, [logout]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await api.post('/api/v1/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('lexflow_token', access_token);
      localStorage.setItem('lexflow_user', JSON.stringify(userData));
      setUser(userData);
      
      // Navigate based on role
      if (userData.role === 'BRANCH_MANAGER' && userData.branch_lgd_code) {
        router.push(`/branch/${userData.branch_lgd_code}/maps`);
      } else {
        router.push('/dashboard');
      }
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
