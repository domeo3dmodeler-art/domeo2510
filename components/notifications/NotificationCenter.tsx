import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Archive, Trash2, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { 
  Notification, 
  NotificationStatus, 
  NotificationType, 
  NotificationPriority,
  NotificationStats
} from '../../lib/notifications/types';
import { NotificationService } from '../../lib/notifications/notification-service';

interface NotificationCenterProps {
  userId: string;
  className?: string;
}

export default function NotificationCenter({ userId, className = "" }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [filter, setFilter] = useState<{
    status?: NotificationStatus;
    type?: NotificationType;
    priority?: NotificationPriority;
  }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const notificationService = NotificationService.getInstance();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка уведомлений
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const [notificationsData, statsData] = await Promise.all([
        notificationService.getNotificationsForUser(userId, {
          status: filter.status,
          type: filter.type,
          limit: 50
        }),
        notificationService.getNotificationStats(userId)
      ]);

      setNotifications(notificationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Подписка на новые уведомления
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      if (notification.userId === userId || !notification.userId) {
        loadNotifications();
      }
    });

    loadNotifications();

    return unsubscribe;
  }, [userId, filter]);

  // Обработка кликов вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фильтрация уведомлений по поисковому запросу
  const filteredNotifications = notifications.filter(notification => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      notification.title.toLowerCase().includes(query) ||
      notification.message.toLowerCase().includes(query) ||
      notification.description?.toLowerCase().includes(query)
    );
  });

  // Обработчики действий
  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(userId);
  };

  const handleArchive = async (notificationId: string) => {
    await notificationService.archiveNotification(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
  };

  const handleAction = async (notification: Notification, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    if (action.type === 'link') {
      window.open(action.action, '_blank');
    } else if (action.type === 'button') {
      // Здесь можно добавить логику для различных действий
      console.log(`Executing action: ${action.action}`);
    }
  };

  // Получение цвета приоритета
  const getPriorityColor = (priority: NotificationPriority): string => {
    const colors = {
      [NotificationPriority.LOW]: 'text-gray-500',
      [NotificationPriority.MEDIUM]: 'text-blue-500',
      [NotificationPriority.HIGH]: 'text-orange-500',
      [NotificationPriority.URGENT]: 'text-red-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  // Получение иконки типа уведомления
  const getTypeIcon = (type: NotificationType): string => {
    const icons = {
      [NotificationType.ORDER_CREATED]: '🛒',
      [NotificationType.QUOTE_GENERATED]: '📄',
      [NotificationType.SUPPLIER_ORDER_GENERATED]: '🏭',
      [NotificationType.SYSTEM_ERROR]: '⚠️',
      [NotificationType.USER_REGISTERED]: '👤',
      [NotificationType.CLIENT_ADDED]: '👥'
    };
    return icons[type] || '🔔';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Кнопка уведомлений */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {stats && stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </Button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Заголовок */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Уведомления</h3>
              <div className="flex space-x-2">
                {stats && stats.unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    Прочитать все
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Поиск */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск уведомлений..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Фильтры */}
            <div className="flex space-x-2">
              <select
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as NotificationStatus || undefined })}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Все статусы</option>
                <option value={NotificationStatus.UNREAD}>Непрочитанные</option>
                <option value={NotificationStatus.READ}>Прочитанные</option>
                <option value={NotificationStatus.ARCHIVED}>Архивные</option>
              </select>
              
              <select
                value={filter.priority || ''}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value as NotificationPriority || undefined })}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Все приоритеты</option>
                <option value={NotificationPriority.URGENT}>Срочные</option>
                <option value={NotificationPriority.HIGH}>Высокие</option>
                <option value={NotificationPriority.MEDIUM}>Средние</option>
                <option value={NotificationPriority.LOW}>Низкие</option>
              </select>
            </div>
          </div>

          {/* Список уведомлений */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Загрузка уведомлений...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.status === NotificationStatus.UNREAD ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Иконка */}
                      <div className="flex-shrink-0">
                        <span className="text-lg">
                          {notification.icon || getTypeIcon(notification.type)}
                        </span>
                      </div>

                      {/* Контент */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              notification.status === NotificationStatus.UNREAD ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.description}
                              </p>
                            )}
                          </div>

                          {/* Действия */}
                          <div className="flex items-center space-x-1 ml-2">
                            {notification.status === NotificationStatus.UNREAD && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Отметить как прочитанное"
                              >
                                <Check className="h-4 w-4 text-gray-500" />
                              </button>
                            )}
                            <button
                              onClick={() => handleArchive(notification.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Архивировать"
                            >
                              <Archive className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>

                        {/* Действия уведомления */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-2 flex space-x-2">
                            {notification.actions.map((action) => (
                              <button
                                key={action.id}
                                onClick={() => handleAction(notification, action.id)}
                                className={`text-xs px-2 py-1 rounded ${
                                  action.style === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                  action.style === 'success' ? 'bg-green-500 text-white hover:bg-green-600' :
                                  action.style === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' :
                                  'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {action.icon && <span className="mr-1">{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Метаданные */}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>{new Date(notification.createdAt).toLocaleString('ru-RU')}</span>
                          <span className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Статистика */}
          {stats && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{stats.total}</div>
                  <div className="text-gray-500">Всего</div>
                </div>
                <div>
                  <div className="font-semibold text-blue-600">{stats.unread}</div>
                  <div className="text-gray-500">Непрочитанных</div>
                </div>
                <div>
                  <div className="font-semibold text-green-600">{Math.round(stats.readRate)}%</div>
                  <div className="text-gray-500">Прочитано</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



