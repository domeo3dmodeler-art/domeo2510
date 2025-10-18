import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '../../../../lib/notifications/notification-service';

const notificationService = NotificationService.getInstance();

// POST - Массовые операции с уведомлениями
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, notificationIds } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Action and userId are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mark_all_as_read':
        await notificationService.markAllAsRead(userId);
        break;
      
      case 'archive_selected':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { error: 'notificationIds array is required for archive_selected' },
            { status: 400 }
          );
        }
        for (const id of notificationIds) {
          await notificationService.archiveNotification(id);
        }
        break;
      
      case 'delete_selected':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { error: 'notificationIds array is required for delete_selected' },
            { status: 400 }
          );
        }
        for (const id of notificationIds) {
          await notificationService.deleteNotification(id);
        }
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk operation completed successfully'
    });
  } catch (error) {
    console.error('Error in bulk notification operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



