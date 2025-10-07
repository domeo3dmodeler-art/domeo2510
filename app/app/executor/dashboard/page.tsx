'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui';
import StatCard from '../../../components/ui/StatCard';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  AlertCircle,
  TrendingUp,
  Loader2,
  Download
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface ExecutorStats {
  totalOrders: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface SupplierOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  totalAmount: number;
  dueDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function ExecutorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ExecutorStats | null>(null);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'reports'>('orders');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Имитация загрузки данных
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalOrders: 12,
        inProgress: 4,
        completed: 7,
        overdue: 1
      });

      setOrders([
        {
          id: '1',
          orderNumber: 'ЗП-001',
          supplier: 'ООО "Поставщик Дверей"',
          status: 'in_progress',
          totalAmount: 125000,
          dueDate: '2024-02-15',
          items: [
            { name: 'Дверь межкомнатная ДМ-001', quantity: 10, price: 8500 },
            { name: 'Дверь входная ВХ-003', quantity: 5, price: 8000 }
          ]
        },
        {
          id: '2',
          orderNumber: 'ЗП-002',
          supplier: 'ИП "Смарт Технологии"',
          status: 'pending',
          totalAmount: 75000,
          dueDate: '2024-02-20',
          items: [
            { name: 'Умный замок SmartLock-200', quantity: 15, price: 5000 }
          ]
        },
        {
          id: '3',
          orderNumber: 'ЗП-003',
          supplier: 'ООО "Фурнитура Плюс"',
          status: 'overdue',
          totalAmount: 45000,
          dueDate: '2024-01-30',
          items: [
            { name: 'Ручка дверная РД-001', quantity: 50, price: 900 }
          ]
        }
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершен';
      case 'overdue': return 'Просрочен';
      default: return status;
    }
  };


  const exportSupplierOrder = async (order: SupplierOrder) => {
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'supplier-order-excel',
          data: {
            orderNumber: order.orderNumber,
            orderDate: new Date().toLocaleDateString('ru-RU'),
            supplierName: order.supplier,
            items: order.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit: 'шт',
              price: item.price,
              total: item.price * item.quantity
            })),
            totalAmount: order.totalAmount,
            deliveryAddress: 'Адрес доставки',
            deliveryContact: 'Контактное лицо'
          }
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Заказ_${order.orderNumber}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error);
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
          Добро пожаловать, {user?.firstName || 'Исполнитель'}!
        </h1>
        <p className="text-gray-600">Панель исполнителя - управление заказами поставщикам</p>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Всего заказов"
            value={stats.totalOrders}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="В работе"
            value={stats.inProgress}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Завершено"
            value={stats.completed}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Просрочено"
            value={stats.overdue}
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Табы */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'orders', name: 'Заказы', icon: Package },
            { id: 'suppliers', name: 'Поставщики', icon: Truck },
            { id: 'reports', name: 'Отчеты', icon: TrendingUp }
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
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Заказы поставщикам</h3>
            <Button className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Новый заказ
            </Button>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                    <p className="text-sm text-gray-500">{order.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Срок поставки: {new Date(order.dueDate).toLocaleDateString('ru-RU')}
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSupplierOrder(order)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать заказ
                  </Button>
                  <Button variant="outline" size="sm">
                    Отметить выполненным
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Поставщики</h3>
          <div className="space-y-4">
            {[
              { name: 'ООО "Поставщик Дверей"', contact: '+7 (999) 123-45-67', status: 'active' },
              { name: 'ИП "Смарт Технологии"', contact: '+7 (999) 234-56-78', status: 'active' },
              { name: 'ООО "Фурнитура Плюс"', contact: '+7 (999) 345-67-89', status: 'inactive' }
            ].map((supplier, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  <p className="text-sm text-gray-500">{supplier.contact}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  supplier.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {supplier.status === 'active' ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Отчеты</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
              <Download className="h-5 w-5 mr-2" />
              Отчет по поставщикам
            </Button>
            <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
              <Download className="h-5 w-5 mr-2" />
              Отчет по заказам
            </Button>
            <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
              <Download className="h-5 w-5 mr-2" />
              Финансовый отчет
            </Button>
            <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
              <Download className="h-5 w-5 mr-2" />
              Отчет по срокам
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
