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
    // Проверяем дублирование: не создавать уведомление, если такое же уже есть
    // Для уведомлений о смене статуса учитываем title для более точного определения дубликата
    const whereClause: any = {
      user_id: data.userId,
      document_id: data.documentId || null,
      type: data.type,
      is_read: false,
      created_at: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // в последние 5 минут
      }
    };
    
    // Если type содержит статус (формат "documentType:status"), проверяем также title для более точного определения
    if (data.type.includes(':')) {
      whereClause.title = data.title;
    }
    
    const existingNotification = await prisma.notification.findFirst({
      where: whereClause
    });

    if (existingNotification) {
      console.log('⚠️ Дубликат уведомления обнаружен, пропускаем создание:', {
        userId: data.userId,
        documentId: data.documentId,
        type: data.type
      });
      return existingNotification;
    }

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
    const roleUpperCase = role.toUpperCase();
    
    // Получаем всех пользователей с указанной ролью
    // Используем case-insensitive поиск: пробуем сначала заглавными буквами, потом строчными
    let users = await prisma.user.findMany({
      where: { 
        role: roleUpperCase,
        is_active: true
      },
      select: { 
        id: true,
        email: true 
      }
    });

    // Если не найдено, пробуем искать строчными буквами
    if (users.length === 0 && roleUpperCase !== role.toLowerCase()) {
      users = await prisma.user.findMany({
        where: { 
          role: role.toLowerCase(),
          is_active: true
        },
        select: { 
          id: true,
          email: true 
        }
      });
    }

    console.log(`📢 Уведомление роли ${roleUpperCase}: найдено ${users.length} активных пользователей`);
    
    if (users.length === 0) {
      console.warn(`⚠️ Нет активных пользователей с ролью ${roleUpperCase} (пробовали также ${role.toLowerCase()}). Уведомления не будут отправлены.`);
      return [];
    }

    console.log(`📤 Отправка уведомления "${data.title}" пользователям:`, users.map(u => u.email).join(', '));

    // Создаем уведомления для каждого пользователя
    const notifications = await Promise.all(
      users.map(user => 
        createNotification({
          ...data,
          userId: user.id
        })
      )
    );

    console.log(`✅ Успешно создано ${notifications.length} уведомлений для роли ${roleUpperCase}`);
    return notifications;
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений роли:', role, error);
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
