'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui';
import StatCard from '../../../components/ui/StatCard';
import { 
  ShoppingCart, 
  FileText, 
  Download, 
  Plus,
  Package,
  Users,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import MultiCategoryCart from '../../../components/cart/MultiCategoryCart';
import DocumentGeneratorSimple from '../../../components/documents/DocumentGeneratorSimple';

interface ComplectatorStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export default function ComplectatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ComplectatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cart' | 'documents' | 'orders'>('cart');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Имитация загрузки статистики
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats({
        totalOrders: 15,
        pendingOrders: 3,
        completedOrders: 12,
        totalRevenue: 125000
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Добро пожаловать, {user?.firstName || 'Комплектовщик'}!
        </h1>
        <p className="text-gray-600">Панель комплектовщика - управление заказами и документами</p>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Всего заказов"
            value={stats.totalOrders}
            icon={ShoppingCart}
            color="blue"
          />
          <StatCard
            title="В обработке"
            value={stats.pendingOrders}
            icon={Package}
            color="yellow"
          />
          <StatCard
            title="Завершено"
            value={stats.completedOrders}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Выручка"
            value={`${stats.totalRevenue.toLocaleString('ru-RU')} ₽`}
            icon={FileText}
            color="purple"
          />
        </div>
      )}

      {/* Табы */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'cart', name: 'Корзина', icon: ShoppingCart },
            { id: 'documents', name: 'Документы', icon: FileText },
            { id: 'orders', name: 'Заказы', icon: Package }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'cart' && (
        <div className="space-y-6">
          <MultiCategoryCart />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <DocumentGeneratorSimple />
          
          {/* Быстрые действия */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="flex items-center justify-center p-4 h-auto"
                onClick={() => {/* Логика создания КП */}}
              >
                <FileText className="h-5 w-5 mr-2" />
                Создать КП
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center p-4 h-auto"
                onClick={() => {/* Логика создания счета */}}
              >
                <Download className="h-5 w-5 mr-2" />
                Создать счет
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center p-4 h-auto"
                onClick={() => {/* Логика просмотра истории */}}
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                История документов
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Заказы</h3>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Новый заказ
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Пример заказа */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Заказ #001</p>
                  <p className="text-sm text-gray-500">Клиент: ООО "Пример"</p>
                  <p className="text-sm text-gray-500">Дата: 15.01.2024</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">45 000 ₽</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    В обработке
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Заказ #002</p>
                  <p className="text-sm text-gray-500">Клиент: ИП Иванов</p>
                  <p className="text-sm text-gray-500">Дата: 14.01.2024</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">28 500 ₽</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Завершен
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
