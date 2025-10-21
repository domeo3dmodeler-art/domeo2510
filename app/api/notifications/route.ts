import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Получить уведомления пользователя
export async function GET(req: NextRequest) {
  try {
    // Получаем user_id из токена
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
    const userId = decoded.userId;

    // Получаем уведомления пользователя
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50 // Ограничиваем количество
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications - Создать уведомление
export async function POST(req: NextRequest) {
  try {
    const { userId, clientId, documentId, type, title, message } = await req.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        client_id: clientId || null,
        document_id: documentId || null,
        type,
        title,
        message,
        created_at: new Date()
      }
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}