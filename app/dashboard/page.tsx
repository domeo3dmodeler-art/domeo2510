'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/layout/AdminLayout';
import ComplectatorDashboard from '../complectator/dashboard/page';
import ExecutorDashboard from '../executor/dashboard/page';
import { Card, Button } from '../../components/ui';
import { ClientAuthGuard } from '../../components/auth/ClientAuthGuard';
import NotificationBell from '../../components/ui/NotificationBell';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: string;
  permissions: string[];
}

export default function DashboardPage() {
  return (
    <ClientAuthGuard>
      <DashboardContent />
    </ClientAuthGuard>
  );
}

function DashboardContent() {
  console.log('🔄 DashboardContent - компонент рендерится');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [complectatorStats, setComplectatorStats] = useState<any>(null);
  const isInitializedRef = useRef(false); // Используем useRef чтобы избежать ре-рендеров
  const router = useRouter();

  // Мемоизируем контент по роли (оптимизировано - для complectator не зависит от stats)
  // Для complectator мы сразу возвращаем ComplectatorDashboard, поэтому не нужно вычислять roleContent
  const roleContent = useMemo(() => {
    if (!user) {
      return {
        title: 'Загрузка...',
        description: 'Пожалуйста, подождите',
        widgets: [],
        quickActions: []
      };
    }
    
    // Для complectator возвращаем минимальный объект - все равно не используется
    if (user.role === 'complectator') {
      return {
        title: 'Личный кабинет комплектатора',
        description: 'Работа с клиентами и коммерческими предложениями',
        widgets: [],
        quickActions: []
      };
    }
    
    switch (user.role) {
      case 'admin':
        return {
          title: 'Панель администратора',
          description: 'Управление системой и пользователями',
          widgets: [
            { title: 'Категории товаров', count: stats?.total?.totalCategories || 0, link: '/admin/categories', icon: '📁' },
            { title: 'Пользователи', count: userCount, link: '/admin/users', icon: '👥' },
            { title: 'Импорт прайсов', count: stats?.total?.totalImports || 0, link: '/admin/import', icon: '📊' },
            { title: 'Товары', count: stats?.total?.totalProducts || 0, link: '/admin/catalog/products', icon: '📦' }
          ].filter(Boolean), // Фильтруем undefined/null элементы
          quickActions: [
            { title: 'Создать категорию', link: '/admin/categories/builder', icon: '➕' },
            { title: 'Импорт прайса', link: '/admin/import', icon: '📥' },
            { title: 'Управление пользователями', link: '/admin/users', icon: '👤' },
            { title: 'Настройки системы', link: '/admin/settings', icon: '⚙️' }
          ].filter(Boolean) // Фильтруем undefined/null элементы
        };
      case 'executor':
        return {
          title: 'Личный кабинет исполнителя',
          description: 'Исполнение заказов и работа с фабрикой',
          widgets: [
            { title: 'Заказы в работе', count: '8', link: '/orders', icon: '⚡' },
            { title: 'Заказы у поставщика', count: '5', link: '/factory', icon: '🏭' },
            { title: 'Выполненные', count: '32', link: '/orders?status=completed', icon: '✅' },
            { title: 'Уведомления', count: '3', link: '/notifications', icon: '🔔' }
          ].filter(Boolean), // Фильтруем undefined/null элементы
          quickActions: [
            { title: 'Новые заказы', link: '/orders?status=new', icon: '🆕' },
            { title: 'Заказ у поставщика', link: '/factory', icon: '🏭' },
            { title: 'Отслеживание', link: '/tracking', icon: '📍' },
            { title: 'Уведомления', link: '/notifications', icon: '🔔' }
          ].filter(Boolean) // Фильтруем undefined/null элементы
        };
      default:
        return {
          title: 'Личный кабинет',
          description: 'Добро пожаловать в систему',
          widgets: [],
          quickActions: []
        };
    }
  }, [user, stats, userCount]); // Убрали complectatorStats - для complectator roleContent не используется
  
  // Дополнительная защита: убеждаемся что widgets и quickActions всегда массивы
  const safeRoleContent = useMemo(() => {
    if (!roleContent) return { title: '', description: '', widgets: [], quickActions: [] };
    return {
      ...roleContent,
      widgets: Array.isArray(roleContent.widgets) ? roleContent.widgets.filter(Boolean) : [],
      quickActions: Array.isArray(roleContent.quickActions) ? roleContent.quickActions.filter(Boolean) : []
    };
  }, [roleContent]);

  // Определяем fetchStats ПЕРЕД использованием в useEffect
  const fetchStats = useCallback(async () => {
    try {
      const promises = [
        fetch('/api/admin/stats').catch(err => {
          console.error('Error fetching admin stats:', err);
          return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500 });
        }),
        fetch('/api/users').catch(err => {
          console.error('Error fetching users:', err);
          return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500 });
        })
      ];

      // Добавляем запрос статистики комплектатора если пользователь комплектатор
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'complectator') {
        promises.push(
          fetch('/api/complectator/stats').catch(err => {
            console.error('Error fetching complectator stats:', err);
            return new Response(JSON.stringify({ error: 'Failed to fetch complectator stats' }), { status: 500 });
          })
        );
      }

      const responses = await Promise.all(promises);
      
      if (responses[0].ok) {
        try {
          const statsData = await responses[0].json();
          setStats(statsData);
        } catch (err) {
          console.error('Error parsing admin stats:', err);
        }
      } else {
        console.warn('Admin stats endpoint returned:', responses[0].status);
      }
      
      if (responses[1].ok) {
        try {
          const usersData = await responses[1].json();
          setUserCount(usersData.users?.length || 0);
        } catch (err) {
          console.error('Error parsing users data:', err);
        }
      } else {
        console.warn('Users endpoint returned:', responses[1].status);
      }

      // Обрабатываем статистику комплектатора
      if (userRole === 'complectator' && responses[2]?.ok) {
        try {
          const complectatorData = await responses[2].json();
          setComplectatorStats(complectatorData.stats);
        } catch (err) {
          console.error('Error parsing complectator stats:', err);
        }
      } else if (userRole === 'complectator') {
        console.warn('Complectator stats endpoint returned:', responses[2]?.status);
      }
    } catch (fetchStatsError) {
      console.error('Error loading stats:', fetchStatsError);
      // Не показываем ошибку пользователю, просто логируем
    }
  }, []);

  useEffect(() => {
    // Защита от повторных вызовов
    if (isInitializedRef.current) {
      console.log('⏭️ DashboardContent - уже инициализирован, пропускаем');
      return;
    }

    console.log('🔄 DashboardContent - useEffect запускается');
    isInitializedRef.current = true; // Устанавливаем флаг сразу чтобы предотвратить повторные вызовы
    
    // Проверяем аутентификацию - сначала localStorage, потом cookie
    let token = localStorage.getItem('authToken');
    if (!token && typeof document !== 'undefined') {
      // Проверяем cookie как fallback
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
    
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    if (!token || !userRole || !userId) {
      console.log('❌ DashboardContent - нет токена, редирект на логин');
      router.push('/login?redirect=/dashboard');
      return;
    }

    console.log('✅ DashboardContent - токен найден, загружаем данные пользователя');
    
    // Если данных в localStorage нет, пытаемся загрузить с сервера
    const loadUserData = async () => {
      try {
        // Пытаемся получить токен из localStorage или cookie для заголовка
        const localToken = localStorage.getItem('authToken');
        let authToken = localToken;
        
        if (!authToken && typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
          if (authCookie) {
            authToken = authCookie.split('=')[1].trim();
          }
        }
        
        const response = await fetch('/api/users/me', {
          headers: authToken ? {
            'Authorization': `Bearer ${authToken}`
          } : {}
        });
        
        if (response.ok) {
          const userDataFromServer = await response.json();
          if (userDataFromServer.user) {
            // Сохраняем в localStorage для следующих запросов
            localStorage.setItem('userEmail', userDataFromServer.user.email || '');
            localStorage.setItem('userFirstName', userDataFromServer.user.firstName || '');
            localStorage.setItem('userLastName', userDataFromServer.user.lastName || '');
            localStorage.setItem('userMiddleName', userDataFromServer.user.middleName || '');
            localStorage.setItem('userRole', userDataFromServer.user.role || userRole);
            localStorage.setItem('userId', userDataFromServer.user.id || userId);
            if (authToken && !localToken) {
              localStorage.setItem('authToken', authToken);
            }
            
            const userData = {
              id: userDataFromServer.user.id || userId,
              email: userDataFromServer.user.email || localStorage.getItem('userEmail') || '',
              firstName: userDataFromServer.user.firstName || localStorage.getItem('userFirstName') || 'Иван',
              lastName: userDataFromServer.user.lastName || localStorage.getItem('userLastName') || 'Иванов',
              middleName: userDataFromServer.user.middleName || localStorage.getItem('userMiddleName') || '',
              role: userDataFromServer.user.role || userRole,
              permissions: userDataFromServer.user.permissions || JSON.parse(localStorage.getItem('userPermissions') || '[]')
            };
            setUser(userData);
          } else {
            throw new Error('User data not found');
          }
        } else {
          // Если API вернул ошибку, используем данные из localStorage
          throw new Error(`Failed to load user data: ${response.status}`);
        }
      } catch (error) {
        console.error('Error loading user data from server:', error);
        // Fallback на localStorage
        const userData = {
          id: userId,
          email: localStorage.getItem('userEmail') || '',
          firstName: localStorage.getItem('userFirstName') || 'Иван',
          lastName: localStorage.getItem('userLastName') || 'Иванов',
          middleName: localStorage.getItem('userMiddleName') || '',
          role: userRole,
          permissions: JSON.parse(localStorage.getItem('userPermissions') || '[]')
        };
        setUser(userData);
      }
    };

    // Загружаем данные пользователя
    loadUserData().then(() => {
      console.log('📊 DashboardContent - загружаем статистику');
      // Загружаем статистику для всех ролей асинхронно, чтобы не блокировать рендер
      fetchStats().catch((fetchError) => {
        console.error('Error in fetchStats:', fetchError);
      });
      setIsLoading(false);
      console.log('✅ DashboardContent - isLoading установлен в false');
    }).catch((error) => {
      console.error('Error in loadUserData:', error);
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - эффект должен выполняться только один раз при монтировании

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userLastName');
    localStorage.removeItem('userMiddleName');
    localStorage.removeItem('userPermissions');
    router.push('/login');
  };

  console.log('🔄 DashboardContent - проверка isLoading:', isLoading, 'user:', user ? user.role : 'null');
  
  if (isLoading) {
    console.log('⏳ DashboardContent - показываем загрузку');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Для админов используем AdminLayout, для остальных - обычный лейаут
  if (user.role === 'admin') {
    return (
      <AdminLayout
        title={safeRoleContent.title}
        subtitle={safeRoleContent.description}
      >
        <div className="space-y-8">
          {/* Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {safeRoleContent.widgets.filter(widget => widget && widget.title && widget.link).map((widget, index) => (
              <Card key={index} variant="interactive" className="hover:border-black transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{widget.title}</p>
                      <p className="text-2xl font-bold text-black mt-1">{widget.count}</p>
                    </div>
                    <div className="text-2xl">{widget?.icon || '📊'}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card variant="base">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Быстрые действия</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {safeRoleContent.quickActions.filter(action => action && action.title && action.link).map((action, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    className="p-4 h-auto flex flex-col items-center space-y-2"
                    onClick={() => action.link && router.push(action.link)}
                  >
                    <div className="text-2xl">{action?.icon || '⚡'}</div>
                    <p className="text-sm font-medium">{action.title}</p>
                  </Button>
                ))}
              </div>
            </div>
          </Card>

        </div>
      </AdminLayout>
    );
  }

  // Для не-админов используем обычный лейаут
  // Специальный случай: роль комплектатора — показываем новый ЛК комплектатора с единой шапкой
  if (user.role === 'complectator') {
    console.log('🎯 DashboardContent - рендер для complectator, загружаем ComplectatorDashboard');
    return (
      <div className="min-h-screen bg-white">
        {/* Header (унифицированный стиль) */}
        <header className="bg-white border-b border-black/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div 
                  onClick={() => router.push('/')}
                  className="cursor-pointer hover:opacity-70 transition-opacity duration-200"
                >
                  <h1 className="text-2xl font-bold text-black">Domeo</h1>
                  <p className="text-xs text-gray-500 font-medium">Личный кабинет</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <NotificationBell userRole={user.role} />
                <div className="text-sm text-gray-700">
                  {user.lastName} {user.firstName.charAt(0)}.{(user.middleName && user.middleName.trim()) ? user.middleName.charAt(0) + '.' : ''} ({getRoleText(user.role)})
                </div>
                <button
                  onClick={() => router.back()}
                  className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ComplectatorDashboard user={user} />
        </main>
      </div>
    );
  }

  // Специальный случай: роль исполнителя — показываем новый ЛК исполнителя с единой шапкой
  if (user.role === 'executor') {
    return (
      <div className="min-h-screen bg-white">
        {/* Header (унифицированный стиль) */}
        <header className="bg-white border-b border-black/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div 
                  onClick={() => router.push('/')}
                  className="cursor-pointer hover:opacity-70 transition-opacity duration-200"
                >
                  <h1 className="text-2xl font-bold text-black">Domeo</h1>
                  <p className="text-xs text-gray-500 font-medium">Личный кабинет</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <NotificationBell userRole={user.role} />
                <div className="text-sm text-gray-700">
                  {user.lastName} {user.firstName.charAt(0)}.{(user.middleName && user.middleName.trim()) ? user.middleName.charAt(0) + '.' : ''} ({getRoleText(user.role)})
                </div>
                <button
                  onClick={() => router.back()}
                  className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExecutorDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div 
                onClick={() => router.push('/')}
                className="cursor-pointer hover:opacity-70 transition-opacity duration-200"
              >
                <h1 className="text-2xl font-bold text-black">Domeo</h1>
                <p className="text-xs text-gray-500 font-medium">Configurators</p>
              </div>
              <div className="flex items-center">
                <span className="text-black mx-3 text-lg font-bold">•</span>
                <h2 className="text-lg font-semibold text-black">{getRoleDisplayName(user.role)}</h2>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.lastName} {user.firstName.charAt(0)}.{(user.middleName && user.middleName.trim()) ? user.middleName.charAt(0) + '.' : ''} ({getRoleText(user.role)})
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">{safeRoleContent.title}</h1>
          <p className="text-gray-600 mt-2">{safeRoleContent.description}</p>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {safeRoleContent.widgets.filter(widget => widget && widget.title && widget.link).map((widget, index) => (
            <div
              key={index}
              onClick={() => widget.link && router.push(widget.link)}
              className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{widget.title}</p>
                  <p className="text-2xl font-bold text-black mt-1">{widget.count}</p>
                </div>
                <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                  {widget?.icon || '📊'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {safeRoleContent.quickActions.filter(action => action && action.title && action.link).map((action, index) => (
              <button
                key={index}
                onClick={() => action.link && router.push(action.link)}
                className="bg-white border border-gray-200 p-4 hover:border-black hover:bg-black hover:text-white transition-all duration-200 group text-center"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                  {action?.icon || '⚡'}
                </div>
                <p className="text-sm font-medium">{action.title}</p>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );

  function getRoleText(role: string) {
    const roleMap: { [key: string]: string } = {
      'admin': 'Администратор',
      'complectator': 'Комплектатор',
      'executor': 'Исполнитель'
    };
    return roleMap[role] || 'Пользователь';
  }

  function getRoleDisplayName(role: string) {
    const roleMap: { [key: string]: string } = {
      'admin': 'Администратор',
      'complectator': 'Комплектатор',
      'executor': 'Исполнитель'
    };
    return roleMap[role] || 'Пользователь';
  }
}
