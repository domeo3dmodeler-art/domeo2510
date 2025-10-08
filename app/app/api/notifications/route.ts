import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications - Получить все уведомления
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (userId) {
      where.user_id = userId;
    }
    
    if (isRead !== null && isRead !== undefined) {
      where.is_read = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          user_id: true,
          type: true,
          title: true,
          message: true,
          is_read: true,
          data: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where })
    ]);

    // Форматируем данные уведомлений
    const processedNotifications = notifications.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.is_read,
      data: notification.data ? JSON.parse(notification.data) : {},
      createdAt: notification.created_at
    }));

    return NextResponse.json({
      success: true,
      notifications: processedNotifications,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении уведомлений' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Создать новое уведомление
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      type, 
      title, 
      message, 
      data 
    } = body;

    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        user_id,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : '{}',
        is_read: false
      }
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read,
        data: notification.data ? JSON.parse(notification.data) : {},
        createdAt: notification.created_at
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании уведомления' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id] - Отметить уведомление как прочитанное
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isRead } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID уведомления не указан' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { is_read: isRead !== undefined ? isRead : true }
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read,
        data: notification.data ? JSON.parse(notification.data) : {},
        createdAt: notification.created_at
      }
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении уведомления' },
      { status: 500 }
    );
  }
}