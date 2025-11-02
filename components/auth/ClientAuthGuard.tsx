'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientAuthGuardProps {
  children: React.ReactNode;
}

export function ClientAuthGuard({ children }: ClientAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        
        // Диагностика localStorage
        console.log('🔍 ClientAuthGuard - localStorage check:', {
          token: token ? token.substring(0, 20) + '...' : 'Нет токена',
          userId: userId || 'Нет userId',
          userRole: userRole || 'Нет userRole',
          allKeys: Object.keys(localStorage)
        });
        
        // Проверяем только токен - это достаточно для авторизации
        if (token) {
          console.log('✅ ClientAuthGuard - авторизация успешна по токену');
          setIsAuthenticated(true);
        } else {
          console.log('❌ ClientAuthGuard - токен не найден, редирект на логин');
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('❌ ClientAuthGuard - ошибка при проверке авторизации:', error);
        setIsAuthenticated(false);
        router.push('/login');
      }
    };

    // Выполняем проверку немедленно, без задержки
    checkAuth();
  }, [router]);

  // Показываем загрузку пока проверяем авторизацию
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован, не показываем ничего (редирект уже произошел)
  if (!isAuthenticated) {
    return null;
  }

  // Если авторизован, показываем содержимое
  return <>{children}</>;
}
