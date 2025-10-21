import { prisma } from '@/lib/prisma';

export interface NotificationData {
  userId: string;
  clientId?: string;
  documentId?: string;
  type: string;
  title: string;
  message: string;
}

// Функция для создания уведомления
export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: data.userId,
        client_id: data.clientId || null,
        document_id: data.documentId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        created_at: new Date()
      }
    });

    console.log('📢 Notification created:', notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Функция для отправки уведомлений всем пользователям с определенной ролью
export async function notifyUsersByRole(role: string, data: Omit<NotificationData, 'userId'>) {
  try {
    // Получаем всех пользователей с указанной ролью
    const users = await prisma.user.findMany({
      where: { 
        role: role,
        is_active: true
      },
      select: { id: true }
    });

    // Создаем уведомления для каждого пользователя
    const notifications = await Promise.all(
      users.map(user => 
        createNotification({
          ...data,
          userId: user.id
        })
      )
    );

    console.log(`📢 Notifications sent to ${notifications.length} users with role ${role}`);
    return notifications;
  } catch (error) {
    console.error('Error notifying users by role:', error);
    throw error;
  }
}

// Функция для отправки уведомления конкретному пользователю
export async function notifyUser(userId: string, data: Omit<NotificationData, 'userId'>) {
  return createNotification({
    ...data,
    userId
  });
}
