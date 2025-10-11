import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Notification, NotificationPriority, NotificationType } from '../../lib/notifications/types';
import { NotificationService } from '../../lib/notifications/notification-service';

interface ToastNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function ToastNotification({ notification, onDismiss }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Анимация появления
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Автоматическое скрытие
    if (notification.autoDismiss && notification.dismissAfter) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, notification.dismissAfter * 1000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const handleAction = (actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (action) {
      if (action.type === 'link') {
        window.open(action.action, '_blank');
      } else if (action.type === 'button') {
        console.log(`Executing action: ${action.action}`);
      }
      handleDismiss();
    }
  };

  // Получение иконки по приоритету
  const getPriorityIcon = (priority: NotificationPriority) => {
    const icons = {
      [NotificationPriority.LOW]: Info,
      [NotificationPriority.MEDIUM]: Info,
      [NotificationPriority.HIGH]: AlertCircle,
      [NotificationPriority.URGENT]: AlertTriangle
    };
    return icons[priority] || Info;
  };

  // Получение цвета по приоритету
  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      [NotificationPriority.LOW]: 'bg-blue-500',
      [NotificationPriority.MEDIUM]: 'bg-blue-500',
      [NotificationPriority.HIGH]: 'bg-orange-500',
      [NotificationPriority.URGENT]: 'bg-red-500'
    };
    return colors[priority] || 'bg-blue-500';
  };

  const IconComponent = getPriorityIcon(notification.priority);
  const priorityColor = getPriorityColor(notification.priority);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'translate-x-full opacity-0' : ''}
      `}
    >
      {/* Индикатор приоритета */}
      <div className={`h-1 w-full rounded-t-lg ${priorityColor}`} />

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Иконка */}
          <div className="flex-shrink-0">
            {notification.icon ? (
              <span className="text-lg">{notification.icon}</span>
            ) : (
              <IconComponent className={`h-5 w-5 ${
                notification.priority === NotificationPriority.URGENT ? 'text-red-500' :
                notification.priority === NotificationPriority.HIGH ? 'text-orange-500' :
                'text-blue-500'
              }`} />
            )}
          </div>

          {/* Контент */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">
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

            {/* Действия */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {notification.actions.slice(0, 2).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className={`
                      text-xs px-3 py-1 rounded font-medium transition-colors
                      ${action.style === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                        action.style === 'success' ? 'bg-green-500 text-white hover:bg-green-600' :
                        action.style === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' :
                        'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    {action.icon && <span className="mr-1">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Кнопка закрытия */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Прогресс-бар для автоскрытия */}
        {notification.autoDismiss && notification.dismissAfter && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${notification.dismissAfter}s linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

interface ToastNotificationsProps {
  userId: string;
}

export default function ToastNotifications({ userId }: ToastNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      // Показываем только уведомления для текущего пользователя с высоким приоритетом
      if (
        (notification.userId === userId || !notification.userId) &&
        [NotificationPriority.HIGH, NotificationPriority.URGENT].includes(notification.priority) &&
        notification.channels.includes('in_app' as any)
      ) {
        setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Максимум 5 уведомлений
      }
    });

    return unsubscribe;
  }, [userId]);

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}



