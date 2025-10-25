import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationStats, NotificationEvent } from '../lib/notifications/types';
import { NotificationService } from '../lib/notifications/notification-service';

interface UseNotificationsOptions {
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  stats: NotificationStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  createNotification: (event: NotificationEvent) => Promise<Notification>;
}

export function useNotifications({
  userId,
  autoRefresh = true,
  refreshInterval = 30000 // 30 секунд
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationService = NotificationService.getInstance();

  // Загрузка уведомлений
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [notificationsData, statsData] = await Promise.all([
        notificationService.getNotificationsForUser(userId, { limit: 100 }),
        notificationService.getNotificationStats(userId)
      ]);

      setNotifications(notificationsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, notificationService]);

  // Отметить как прочитанное
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await loadNotifications(); // Обновляем данные
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notificationService, loadNotifications]);

  // Отметить все как прочитанные
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead(userId);
      await loadNotifications(); // Обновляем данные
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [userId, notificationService, loadNotifications]);

  // Архивировать уведомление
  const archive = useCallback(async (id: string) => {
    try {
      await notificationService.archiveNotification(id);
      await loadNotifications(); // Обновляем данные
    } catch (err) {
      console.error('Error archiving notification:', err);
    }
  }, [notificationService, loadNotifications]);

  // Удалить уведомление
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      await loadNotifications(); // Обновляем данные
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notificationService, loadNotifications]);

  // Создать уведомление
  const createNotification = useCallback(async (event: NotificationEvent): Promise<Notification> => {
    try {
      const notification = await notificationService.createNotification(event);
      await loadNotifications(); // Обновляем данные
      return notification;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }, [notificationService, loadNotifications]);

  // Подписка на новые уведомления
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = notificationService.subscribe((notification) => {
      // Обновляем уведомления только если они для текущего пользователя
      if (notification.userId === userId || !notification.userId) {
        loadNotifications();
      }
    });

    return unsubscribe;
  }, [userId, notificationService, loadNotifications]);

  // Автообновление
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    loadNotifications();

    const interval = setInterval(loadNotifications, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId, loadNotifications]);

  return {
    notifications,
    stats,
    isLoading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    archive,
    deleteNotification,
    createNotification
  };
}

// Хук для создания уведомлений (упрощенный)
export function useCreateNotification() {
  const notificationService = NotificationService.getInstance();

  const createNotification = useCallback(async (event: NotificationEvent): Promise<Notification> => {
    try {
      return await notificationService.createNotification(event);
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }, [notificationService]);

  return { createNotification };
}

// Хук для получения статистики уведомлений
export function useNotificationStats(userId: string) {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const notificationService = NotificationService.getInstance();

  const loadStats = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const statsData = await notificationService.getNotificationStats(userId);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading notification stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, notificationService]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, isLoading, refresh: loadStats };
}



