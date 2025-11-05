import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthToken } from './useAuthToken';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: string;
  lastLogin?: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const router = useRouter();

  // Проверка токена при загрузке
  const checkAuth = useCallback(async () => {
    try {
      const token = getCookie('auth-token');
      
      if (!token) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        return;
      }

      // Проверяем токен через API
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        // Токен недействителен
        deleteCookie('auth-token');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Ошибка проверки авторизации'
      });
    }
  }, []);

  // Вход в систему
  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Сохраняем токен в cookies
        setCookie('auth-token', data.token, 1); // 1 день
        
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });

        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Ошибка входа'
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Ошибка соединения с сервером';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Выход из системы
  const logout = useCallback(() => {
    deleteCookie('auth-token');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    router.push('/login');
  }, [router]);

  // Регистрация
  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    role: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: null
        }));
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Ошибка регистрации'
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Ошибка соединения с сервером';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Проверка роли
  const hasRole = useCallback((role: string) => {
    return authState.user?.role === role;
  }, [authState.user]);

  // Проверка прав доступа
  const hasPermission = useCallback((permission: string) => {
    if (!authState.user) return false;
    
    // Простая проверка прав на основе роли
    const rolePermissions = {
      admin: ['*'], // Админ имеет все права
      complectator: ['categories', 'catalog', 'documents'],
      executor: ['catalog', 'orders']
    };

    const userPermissions = rolePermissions[authState.user.role as keyof typeof rolePermissions] || [];
    
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [authState.user]);

  // Проверка авторизации при загрузке
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    logout,
    register,
    hasRole,
    hasPermission,
    checkAuth
  };
}

// Утилиты для работы с cookies
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  // Для локальной разработки убираем secure
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const secureFlag = isLocalhost ? '' : 'secure;';
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;${secureFlag}samesite=lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
