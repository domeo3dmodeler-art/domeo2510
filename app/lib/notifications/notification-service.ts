// lib/notifications/notification-service.ts
// Сервис для управления уведомлениями

import { 
  Notification, 
  NotificationEvent, 
  NotificationPreferences, 
  NotificationStats,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationChannel,
  NotificationTemplate
} from './types';

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private templates: Map<NotificationType, NotificationTemplate> = new Map();
  private listeners: Set<(notification: Notification) => void> = new Set();

  private constructor() {
    this.initializeTemplates();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Инициализация шаблонов уведомлений
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'order_created',
        type: NotificationType.ORDER_CREATED,
        name: 'Новый заказ',
        description: 'Уведомление о создании нового заказа',
        titleTemplate: 'Новый заказ #{orderNumber}',
        messageTemplate: 'Создан новый заказ на сумму {amount} ₽',
        descriptionTemplate: 'Клиент: {clientName}. Менеджер: {managerName}',
        icon: '🛒',
        color: '#10B981',
        defaultPriority: NotificationPriority.HIGH,
        defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        defaultActions: [
          {
            id: 'view_order',
            label: 'Посмотреть заказ',
            type: 'link',
            action: '/admin/orders/{orderId}',
            style: 'primary',
            icon: '👁️'
          }
        ],
        variables: ['orderNumber', 'amount', 'clientName', 'managerName', 'orderId'],
        conditions: {
          roles: ['admin', 'complectator']
        }
      },
      {
        id: 'quote_generated',
        type: NotificationType.QUOTE_GENERATED,
        name: 'КП сгенерировано',
        description: 'Уведомление о генерации коммерческого предложения',
        titleTemplate: 'КП #{quoteNumber} готово',
        messageTemplate: 'Коммерческое предложение для {clientName} готово к отправке',
        descriptionTemplate: 'Сумма: {amount} ₽. Менеджер: {managerName}',
        icon: '📄',
        color: '#3B82F6',
        defaultPriority: NotificationPriority.MEDIUM,
        defaultChannels: [NotificationChannel.IN_APP],
        defaultActions: [
          {
            id: 'view_quote',
            label: 'Открыть КП',
            type: 'link',
            action: '/admin/quotes/{quoteId}',
            style: 'primary',
            icon: '📄'
          },
          {
            id: 'send_quote',
            label: 'Отправить клиенту',
            type: 'button',
            action: 'send_quote',
            style: 'success',
            icon: '📧'
          }
        ],
        variables: ['quoteNumber', 'clientName', 'amount', 'managerName', 'quoteId']
      },
      {
        id: 'supplier_order_generated',
        type: NotificationType.SUPPLIER_ORDER_GENERATED,
        name: 'Заказ поставщику',
        description: 'Уведомление о генерации заказа поставщику',
        titleTemplate: 'Заказ поставщику #{orderNumber}',
        messageTemplate: 'Создан заказ поставщику {supplierName}',
        descriptionTemplate: 'Количество позиций: {itemsCount}. Сумма: {amount} ₽',
        icon: '🏭',
        color: '#F59E0B',
        defaultPriority: NotificationPriority.HIGH,
        defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        defaultActions: [
          {
            id: 'view_order',
            label: 'Посмотреть заказ',
            type: 'link',
            action: '/admin/supplier-orders/{orderId}',
            style: 'primary',
            icon: '👁️'
          },
          {
            id: 'send_to_supplier',
            label: 'Отправить поставщику',
            type: 'button',
            action: 'send_to_supplier',
            style: 'success',
            icon: '📧'
          }
        ],
        variables: ['orderNumber', 'supplierName', 'itemsCount', 'amount', 'orderId'],
        conditions: {
          roles: ['admin', 'executor']
        }
      },
      {
        id: 'system_error',
        type: NotificationType.SYSTEM_ERROR,
        name: 'Системная ошибка',
        description: 'Уведомление о системной ошибке',
        titleTemplate: 'Системная ошибка',
        messageTemplate: '{errorMessage}',
        descriptionTemplate: 'Время: {timestamp}. Модуль: {module}',
        icon: '⚠️',
        color: '#EF4444',
        defaultPriority: NotificationPriority.URGENT,
        defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        defaultActions: [
          {
            id: 'view_logs',
            label: 'Посмотреть логи',
            type: 'link',
            action: '/admin/logs',
            style: 'primary',
            icon: '📋'
          }
        ],
        variables: ['errorMessage', 'timestamp', 'module'],
        conditions: {
          roles: ['admin']
        }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  // Создание уведомления
  async createNotification(event: NotificationEvent): Promise<Notification> {
    const template = this.templates.get(event.type);
    if (!template) {
      throw new Error(`Template not found for type: ${event.type}`);
    }

    const notification: Notification = {
      id: this.generateId(),
      type: event.type,
      title: this.processTemplate(template.titleTemplate, event),
      message: this.processTemplate(template.messageTemplate, event),
      description: event.description || this.processTemplate(template.descriptionTemplate || '', event),
      icon: template.icon,
      color: template.color,
      priority: event.priority || template.defaultPriority,
      status: NotificationStatus.UNREAD,
      channels: event.channels || template.defaultChannels,
      metadata: event.metadata,
      actions: event.actions || template.defaultActions,
      userId: event.targetUsers?.[0], // Для простоты берем первого пользователя
      role: event.targetRoles?.[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: event.expiresAt,
      showInHeader: this.shouldShowInHeader(event.priority || template.defaultPriority),
      showInSidebar: true,
      autoDismiss: event.autoDismiss || false,
      dismissAfter: event.dismissAfter || this.getDefaultDismissTime(event.priority || template.defaultPriority)
    };

    this.notifications.set(notification.id, notification);
    
    // Отправляем уведомление всем слушателям
    this.notifyListeners(notification);
    
    return notification;
  }

  // Получение уведомлений для пользователя
  async getNotificationsForUser(
    userId: string, 
    options: {
      status?: NotificationStatus;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values())
      .filter(n => 
        n.userId === userId || 
        (n.role && this.userHasRole(userId, n.role))
      );

    if (options.status) {
      notifications = notifications.filter(n => n.status === options.status);
    }

    if (options.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    // Сортируем по приоритету и времени создания
    notifications.sort((a, b) => {
      const priorityOrder = {
        [NotificationPriority.URGENT]: 4,
        [NotificationPriority.HIGH]: 3,
        [NotificationPriority.MEDIUM]: 2,
        [NotificationPriority.LOW]: 1
      };
      
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Применяем пагинацию
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    return notifications.slice(offset, offset + limit);
  }

  // Отметить уведомление как прочитанное
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      notification.updatedAt = new Date();
      this.notifyListeners(notification);
    }
  }

  // Отметить все уведомления как прочитанные
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.status === NotificationStatus.UNREAD);
    
    notifications.forEach(notification => {
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      notification.updatedAt = new Date();
      this.notifyListeners(notification);
    });
  }

  // Архивировать уведомление
  async archiveNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = NotificationStatus.ARCHIVED;
      notification.updatedAt = new Date();
      this.notifyListeners(notification);
    }
  }

  // Удалить уведомление
  async deleteNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = NotificationStatus.DELETED;
      this.notifications.delete(notificationId);
    }
  }

  // Получить статистику уведомлений
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => n.status === NotificationStatus.UNREAD).length,
      read: notifications.filter(n => n.status === NotificationStatus.READ).length,
      archived: notifications.filter(n => n.status === NotificationStatus.ARCHIVED).length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      byStatus: {} as Record<NotificationStatus, number>,
      today: this.getNotificationsForPeriod(notifications, 1),
      thisWeek: this.getNotificationsForPeriod(notifications, 7),
      thisMonth: this.getNotificationsForPeriod(notifications, 30),
      readRate: 0,
      actionRate: 0,
      responseTime: 0
    };

    // Подсчитываем статистику по типам, приоритетам и статусам
    Object.values(NotificationType).forEach(type => {
      stats.byType[type] = notifications.filter(n => n.type === type).length;
    });

    Object.values(NotificationPriority).forEach(priority => {
      stats.byPriority[priority] = notifications.filter(n => n.priority === priority).length;
    });

    Object.values(NotificationStatus).forEach(status => {
      stats.byStatus[status] = notifications.filter(n => n.status === status).length;
    });

    // Рассчитываем метрики эффективности
    if (stats.total > 0) {
      stats.readRate = (stats.read / stats.total) * 100;
      stats.actionRate = (notifications.filter(n => n.actions && n.actions.length > 0).length / stats.total) * 100;
      
      const readNotifications = notifications.filter(n => n.readAt);
      if (readNotifications.length > 0) {
        const avgResponseTime = readNotifications.reduce((sum, n) => {
          if (n.readAt) {
            return sum + (n.readAt.getTime() - n.createdAt.getTime());
          }
          return sum;
        }, 0) / readNotifications.length;
        stats.responseTime = Math.round(avgResponseTime / (1000 * 60)); // в минутах
      }
    }

    return stats;
  }

  // Подписка на уведомления
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Уведомление слушателей
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Вспомогательные методы
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private processTemplate(template: string, event: NotificationEvent): string {
    let processed = template;
    
    // Заменяем переменные из metadata
    if (event.metadata?.data) {
      Object.entries(event.metadata.data).forEach(([key, value]) => {
        processed = processed.replace(new RegExp(`{${key}}`, 'g'), String(value));
      });
    }

    // Заменяем стандартные переменные
    const standardVars = {
      timestamp: new Date().toLocaleString('ru-RU'),
      date: new Date().toLocaleDateString('ru-RU'),
      time: new Date().toLocaleTimeString('ru-RU')
    };

    Object.entries(standardVars).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return processed;
  }

  private shouldShowInHeader(priority: NotificationPriority): boolean {
    return [NotificationPriority.HIGH, NotificationPriority.URGENT].includes(priority);
  }

  private getDefaultDismissTime(priority: NotificationPriority): number {
    const dismissTimes = {
      [NotificationPriority.LOW]: 10,      // 10 секунд
      [NotificationPriority.MEDIUM]: 15,   // 15 секунд
      [NotificationPriority.HIGH]: 30,     // 30 секунд
      [NotificationPriority.URGENT]: 0     // Не скрывать автоматически
    };
    return dismissTimes[priority] || 10;
  }

  private getNotificationsForPeriod(notifications: Notification[], days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return notifications.filter(n => n.createdAt >= cutoffDate).length;
  }

  private userHasRole(userId: string, role: string): boolean {
    // Здесь должна быть логика проверки роли пользователя
    // Пока возвращаем true для демонстрации
    return true;
  }
}



