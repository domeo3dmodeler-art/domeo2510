'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users, ShoppingCart, FileText, Settings, BarChart3, Bell, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, hasRole, hasPermission } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: {
        title: 'Администратор системы',
        description: 'Полный доступ ко всем функциям системы',
        features: [
          'Управление пользователями',
          'Настройки системы',
          'Аналитика и отчеты',
          'Управление каталогом',
          'Создание конфигураций'
        ]
      },
      complectator: {
        title: 'Комплектатор',
        description: 'Создание коммерческих предложений и счетов',
        features: [
          'Создание конфигураций товаров',
          'Генерация КП (PDF)',
          'Генерация Счетов (PDF)',
          'Управление каталогом товаров',
          'Импорт товаров'
        ]
      },
      executor: {
        title: 'Исполнитель заказа',
        description: 'Обработка заказов и взаимодействие с поставщиками',
        features: [
          'Просмотр каталога товаров',
          'Генерация заказов поставщику (Excel)',
          'Отслеживание заказов',
          'Работа с клиентами'
        ]
      }
    };
    
    return descriptions[role as keyof typeof descriptions] || descriptions.complectator;
  };

  const roleInfo = getRoleDescription(user.role);

  const quickActions = [
    {
      title: 'Каталог товаров',
      description: 'Управление товарами и категориями',
      href: '/admin/catalog',
      icon: ShoppingCart,
      available: hasPermission('catalog'),
      color: 'bg-blue-500'
    },
    {
      title: 'Конструктор страниц',
      description: 'Создание конфигураций товаров',
      href: '/admin/categories/builder',
      icon: FileText,
      available: hasPermission('categories'),
      color: 'bg-green-500'
    },
    {
      title: 'Профессиональный конструктор',
      description: 'Продвинутый конструктор с интеграцией каталога',
      href: '/professional-builder',
      icon: Wrench,
      available: hasPermission('categories'),
      color: 'bg-indigo-500'
    },
    {
      title: 'Пользователи',
      description: 'Управление пользователями системы',
      href: '/admin/users',
      icon: Users,
      available: hasRole('admin'),
      color: 'bg-purple-500'
    },
    {
      title: 'Настройки',
      description: 'Настройки системы',
      href: '/admin/settings',
      icon: Settings,
      available: hasRole('admin'),
      color: 'bg-gray-500'
    },
    {
      title: 'Аналитика',
      description: 'Отчеты и статистика',
      href: '/analytics',
      icon: BarChart3,
      available: hasRole('admin'),
      color: 'bg-orange-500'
    },
    {
      title: 'Уведомления',
      description: 'Система уведомлений',
      href: '/admin/notifications-demo',
      icon: Bell,
      available: true,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Добро пожаловать, {user.firstName} {user.lastName}!
        </h1>
        <p className="text-lg text-gray-600">
          Панель управления системой Domeo
        </p>
      </div>

      {/* Информация о роли */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${user.role === 'admin' ? 'bg-red-100' : user.role === 'complectator' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {user.role === 'admin' && <Users className="h-6 w-6 text-red-600" />}
            {user.role === 'complectator' && <FileText className="h-6 w-6 text-blue-600" />}
            {user.role === 'executor' && <ShoppingCart className="h-6 w-6 text-green-600" />}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {roleInfo.title}
            </h2>
            <p className="text-gray-600 mb-4">
              {roleInfo.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roleInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Быстрые действия
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.available ? action.href : '#'}
              className={`block p-6 rounded-lg border transition-all duration-200 ${
                action.available
                  ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${action.color} ${action.available ? '' : 'opacity-50'}`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {action.description}
                  </p>
                  {!action.available && (
                    <p className="text-red-500 text-xs mt-2">
                      Недоступно для вашей роли
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Статистика системы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
            <div className="text-sm text-gray-600">Всего товаров</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">0</div>
            <div className="text-sm text-gray-600">Активных заказов</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">0</div>
            <div className="text-sm text-gray-600">Сгенерированных КП</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
            <div className="text-sm text-gray-600">Пользователей</div>
          </div>
        </div>
      </div>
    </div>
  );
}