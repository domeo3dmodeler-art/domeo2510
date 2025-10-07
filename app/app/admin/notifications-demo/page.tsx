'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { useCreateNotification } from '../../../hooks/useNotifications';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel 
} from '../../../lib/notifications/types';

export default function NotificationsDemo() {
  const { createNotification } = useCreateNotification();
  const [isCreating, setIsCreating] = useState(false);

  const demoNotifications = [
    {
      type: NotificationType.ORDER_CREATED,
      title: 'Новый заказ #12345',
      message: 'Создан новый заказ на сумму 150,000 ₽',
      description: 'Клиент: ООО "Пример". Менеджер: Иванов И.И.',
      priority: NotificationPriority.HIGH,
      metadata: {
        data: {
          orderNumber: '12345',
          amount: '150,000',
          clientName: 'ООО "Пример"',
          managerName: 'Иванов И.И.',
          orderId: '12345'
        }
      }
    },
    {
      type: NotificationType.QUOTE_GENERATED,
      title: 'КП #КП-001 готово',
      message: 'Коммерческое предложение для ООО "Тест" готово к отправке',
      description: 'Сумма: 75,000 ₽. Менеджер: Петров П.П.',
      priority: NotificationPriority.MEDIUM,
      metadata: {
        data: {
          quoteNumber: 'КП-001',
          clientName: 'ООО "Тест"',
          amount: '75,000',
          managerName: 'Петров П.П.',
          quoteId: 'quote-001'
        }
      }
    },
    {
      type: NotificationType.SUPPLIER_ORDER_GENERATED,
      title: 'Заказ поставщику #ЗП-002',
      message: 'Создан заказ поставщику "Фабрика Дверей"',
      description: 'Количество позиций: 25. Сумма: 200,000 ₽',
      priority: NotificationPriority.HIGH,
      metadata: {
        data: {
          orderNumber: 'ЗП-002',
          supplierName: 'Фабрика Дверей',
          itemsCount: '25',
          amount: '200,000',
          orderId: 'supplier-order-002'
        }
      }
    },
    {
      type: NotificationType.SYSTEM_ERROR,
      title: 'Системная ошибка',
      message: 'Ошибка при синхронизации с 1С',
      description: 'Время: 14:30. Модуль: Интеграция 1С',
      priority: NotificationPriority.URGENT,
      metadata: {
        data: {
          errorMessage: 'Ошибка при синхронизации с 1С',
          timestamp: '14:30',
          module: 'Интеграция 1С'
        }
      }
    },
    {
      type: NotificationType.USER_REGISTERED,
      title: 'Новый пользователь',
      message: 'Зарегистрирован новый пользователь Сидоров С.С.',
      description: 'Роль: Комплектатор. Email: sidorov@example.com',
      priority: NotificationPriority.LOW,
      metadata: {
        data: {
          userName: 'Сидоров С.С.',
          userRole: 'Комплектатор',
          userEmail: 'sidorov@example.com'
        }
      }
    }
  ];

  const handleCreateNotification = async (notificationData: any) => {
    setIsCreating(true);
    try {
      await createNotification({
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        description: notificationData.description,
        targetUsers: ['demo-user'],
        priority: notificationData.priority,
        channels: [NotificationChannel.IN_APP],
        metadata: notificationData.metadata,
        autoDismiss: notificationData.priority === NotificationPriority.URGENT ? false : true,
        dismissAfter: notificationData.priority === NotificationPriority.URGENT ? 0 : 10
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔔 Демо системы уведомлений
        </h1>
        <p className="text-gray-600">
          Протестируйте различные типы уведомлений. Они появятся в центре уведомлений в шапке страницы.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoNotifications.map((notification, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {notification.type === NotificationType.ORDER_CREATED && '🛒'}
                  {notification.type === NotificationType.QUOTE_GENERATED && '📄'}
                  {notification.type === NotificationType.SUPPLIER_ORDER_GENERATED && '🏭'}
                  {notification.type === NotificationType.SYSTEM_ERROR && '⚠️'}
                  {notification.type === NotificationType.USER_REGISTERED && '👤'}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {notification.title}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    notification.priority === NotificationPriority.URGENT ? 'bg-red-100 text-red-800' :
                    notification.priority === NotificationPriority.HIGH ? 'bg-orange-100 text-orange-800' :
                    notification.priority === NotificationPriority.MEDIUM ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.priority}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">{notification.message}</p>
              <p className="text-sm text-gray-500">{notification.description}</p>
            </div>

            <Button
              onClick={() => handleCreateNotification(notification)}
              disabled={isCreating}
              className={`w-full ${
                notification.priority === NotificationPriority.URGENT ? 'bg-red-600 hover:bg-red-700' :
                notification.priority === NotificationPriority.HIGH ? 'bg-orange-600 hover:bg-orange-700' :
                notification.priority === NotificationPriority.MEDIUM ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isCreating ? 'Создание...' : 'Создать уведомление'}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          💡 Как использовать
        </h2>
        <ul className="text-blue-800 space-y-1">
          <li>• Нажмите на кнопку "Создать уведомление" для любого типа</li>
          <li>• Уведомления появятся в центре уведомлений (колокольчик в шапке)</li>
          <li>• Высокоприоритетные уведомления также покажутся как всплывающие</li>
          <li>• Используйте фильтры и поиск в центре уведомлений</li>
          <li>• Отмечайте уведомления как прочитанные или архивируйте их</li>
        </ul>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          🔧 Типы уведомлений
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Бизнес-процессы:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Заказы (создание, обновление, завершение)</li>
              <li>• Документы (КП, Счета, Заказы поставщику)</li>
              <li>• Клиенты (добавление, обновление, контакты)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Системные:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Пользователи (регистрация, смена ролей)</li>
              <li>• Ошибки и предупреждения</li>
              <li>• Интеграции (1С, внешние сервисы)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}



