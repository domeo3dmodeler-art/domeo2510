import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '../../../lib/notifications/notification-service';
import { NotificationEvent, NotificationType, NotificationPriority, NotificationChannel } from '../../../lib/notifications/types';

const notificationService = NotificationService.getInstance();

// GET - Получение уведомлений для пользователя
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const notifications = await notificationService.getNotificationsForUser(userId, {
      status: status as any,
      type: type as any,
      priority: priority as any,
      limit,
      offset
    });

    const stats = await notificationService.getNotificationStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Создание нового уведомления
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      title,
      message,
      description,
      targetUsers,
      targetRoles,
      targetDepartments,
      metadata,
      actions,
      priority,
      channels,
      expiresAt,
      autoDismiss,
      dismissAfter
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    const event: NotificationEvent = {
      type: type as NotificationType,
      title,
      message,
      description,
      targetUsers,
      targetRoles,
      targetDepartments,
      metadata,
      actions,
      priority: priority as NotificationPriority,
      channels: channels as NotificationChannel[],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      autoDismiss,
      dismissAfter
    };

    const notification = await notificationService.createNotification(event);

    return NextResponse.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



