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
    // Проверяем авторизацию только на клиенте
    if (typeof window === 'undefined') {
      return;
    }

    // Защита от повторных вызовов
    let isMounted = true;

    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        
        // Диагностика localStorage
        console.log('🔍 ClientAuthGuard - localStorage check:', {
          token: token ? token.substring(0, 20) + '...' : 'Нет токена',
          userId: localStorage.getItem('userId') || 'Нет userId',
          userRole: localStorage.getItem('userRole') || 'Нет userRole',
          allKeys: Object.keys(localStorage)
        });
        
        // Проверяем только токен - это достаточно для авторизации
        if (token) {
          console.log('✅ ClientAuthGuard - авторизация успешна по токену');
          // Используем функцию обновления состояния для гарантированного обновления, но только если компонент еще смонтирован
          if (isMounted) {
            setIsAuthenticated((prev) => {
              // Предотвращаем повторные установки
              if (prev === true) {
                console.log('⏭️ ClientAuthGuard - уже авторизован, пропускаем');
                return prev;
              }
              console.log('🔄 ClientAuthGuard - обновление состояния, prev:', prev, '-> true');
              return true;
            });
          }
        } else {
          console.log('❌ ClientAuthGuard - токен не найден, редирект на логин');
          if (isMounted) {
            setIsAuthenticated(false);
            router.push('/login');
          }
        }
      } catch (authError) {
        console.error('❌ ClientAuthGuard - ошибка при проверке авторизации:', authError);
        if (isMounted) {
          setIsAuthenticated(false);
          router.push('/login');
        }
      }
    };

    // Выполняем проверку немедленно, без задержки
    checkAuth();

    return () => {
      isMounted = false;
    };
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
    console.log('❌ ClientAuthGuard - рендер: не авторизован');
    return null;
  }

  // Если авторизован, показываем содержимое
  console.log('✅ ClientAuthGuard - рендер: авторизован, показываем содержимое');
  return <>{children}</>;
}
