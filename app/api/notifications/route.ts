import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// GET /api/notifications - Получить уведомления пользователя
export async function GET(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
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
      logger.warn('Запрос уведомлений без токена', 'notifications/GET', {}, loggingContext);
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }

    const jwt = require('jsonwebtoken');
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
      userId = decoded.userId;
    } catch (jwtError) {
      logger.warn('Невалидный JWT токен', 'notifications/GET', { error: jwtError }, loggingContext);
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }

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

    return NextResponse.json({ notifications }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    logger.error('Error fetching notifications', 'notifications/GET', { 
      error: errorMessage,
      stack: error?.stack,
      code: error?.code
    }, loggingContext);
    
    return NextResponse.json({ 
      error: 'Failed to fetch notifications',
      message: errorMessage,
      code: error?.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

// POST /api/notifications - Создать уведомление
export async function POST(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const body = await req.json();
    const { userId, clientId, documentId, type, title, message } = body;

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
        is_read: false,
        created_at: new Date()
      }
    });

    return NextResponse.json({ notification }, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    logger.error('Error creating notification', 'notifications/POST', { error }, loggingContext);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}