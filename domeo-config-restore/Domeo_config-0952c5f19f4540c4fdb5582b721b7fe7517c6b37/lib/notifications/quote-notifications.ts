// lib/notifications/quote-notifications.ts
// Система уведомлений о смене статусов КП

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type QuoteNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  quoteId: string;
  quoteTitle: string;
  timestamp: Date;
  read: boolean;
};

export type NotificationSettings = {
  emailNotifications: boolean;
  browserNotifications: boolean;
  statusChangeNotifications: boolean;
  newQuoteNotifications: boolean;
};

class QuoteNotificationService {
  private notifications: QuoteNotification[] = [];
  private settings: NotificationSettings = {
    emailNotifications: true,
    browserNotifications: true,
    statusChangeNotifications: true,
    newQuoteNotifications: true
  };

  // Создать уведомление о смене статуса КП
  createStatusChangeNotification(
    quoteId: string,
    quoteTitle: string,
    oldStatus: string,
    newStatus: string
  ): QuoteNotification {
    const statusLabels = {
      draft: 'Черновик',
      sent: 'Отправлен',
      accepted: 'Принят',
      rejected: 'Отклонен'
    };

    const notification: QuoteNotification = {
      id: `quote-${quoteId}-${Date.now()}`,
      type: this.getNotificationType(newStatus),
      title: 'Статус КП изменен',
      message: `КП "${quoteTitle}" изменен с "${statusLabels[oldStatus as keyof typeof statusLabels]}" на "${statusLabels[newStatus as keyof typeof statusLabels]}"`,
      quoteId,
      quoteTitle,
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);
    return notification;
  }

  // Создать уведомление о новом КП
  createNewQuoteNotification(quoteId: string, quoteTitle: string): QuoteNotification {
    const notification: QuoteNotification = {
      id: `quote-new-${quoteId}-${Date.now()}`,
      type: 'info',
      title: 'Новый КП создан',
      message: `Создан новый КП "${quoteTitle}"`,
      quoteId,
      quoteTitle,
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);
    return notification;
  }

  // Создать уведомление о принятии КП
  createQuoteAcceptedNotification(quoteId: string, quoteTitle: string): QuoteNotification {
    const notification: QuoteNotification = {
      id: `quote-accepted-${quoteId}-${Date.now()}`,
      type: 'success',
      title: 'КП принят',
      message: `КП "${quoteTitle}" принят клиентом и готов к экспорту на фабрику`,
      quoteId,
      quoteTitle,
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);
    return notification;
  }

  // Добавить уведомление в список
  private addNotification(notification: QuoteNotification): void {
    this.notifications.unshift(notification);
    
    // Ограничиваем количество уведомлений
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Отправляем браузерное уведомление
    if (this.settings.browserNotifications) {
      this.sendBrowserNotification(notification);
    }

    // Отправляем email уведомление (заглушка)
    if (this.settings.emailNotifications) {
      this.sendEmailNotification(notification);
    }
  }

  // Определить тип уведомления по статусу
  private getNotificationType(status: string): NotificationType {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'sent':
        return 'info';
      default:
        return 'info';
    }
  }

  // Отправить браузерное уведомление
  private sendBrowserNotification(notification: QuoteNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }

  // Отправить email уведомление (заглушка)
  private sendEmailNotification(notification: QuoteNotification): void {
    console.log('Email notification:', notification);
    // Здесь будет интеграция с email сервисом
  }

  // Получить все уведомления
  getNotifications(): QuoteNotification[] {
    return this.notifications;
  }

  // Получить непрочитанные уведомления
  getUnreadNotifications(): QuoteNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  // Отметить уведомление как прочитанное
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  // Отметить все уведомления как прочитанные
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  // Удалить уведомление
  removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  // Очистить все уведомления
  clearAllNotifications(): void {
    this.notifications = [];
  }

  // Получить настройки уведомлений
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Обновить настройки уведомлений
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Запросить разрешение на браузерные уведомления
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

// Экспортируем singleton instance
export const quoteNotificationService = new QuoteNotificationService();
