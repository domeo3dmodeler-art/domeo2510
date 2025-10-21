import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/notifications/[id]/read - Отметить уведомление как прочитанное
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Получаем user_id из токена (поддерживаем и Authorization header и Cookie)
    let token = null;
    let userId = null;

    // Сначала пробуем Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Если нет Authorization header, пробуем Cookie
      const cookies = req.headers.get('cookie');
      if (cookies) {
        const authTokenMatch = cookies.match(/auth-token=([^;]+)/);
        if (authTokenMatch) {
          token = authTokenMatch[1];
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
    userId = decoded.userId;

    // Обновляем уведомление
    const notification = await prisma.notification.updateMany({
      where: { 
        id: id,
        user_id: userId // Убеждаемся, что пользователь может изменить только свои уведомления
      },
      data: { is_read: true }
    });

    if (notification.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
