import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { apiSuccess, apiError, ApiErrorCode, withErrorHandling } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/request-helpers';

// GET /api/notifications - Получить уведомления пользователя
async function getHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);

  // Получаем уведомления пользователя
  const notifications = await prisma.notification.findMany({
    where: { user_id: user.userId },
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

  return apiSuccess({ notifications });
}

export const GET = withErrorHandling(
  requireAuth(getHandler),
  'notifications/GET'
);

// POST /api/notifications - Создать уведомление
async function postHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);
  const body = await req.json();
  const { userId, clientId, documentId, type, title, message } = body;

  if (!userId || !type || !title || !message) {
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      'Отсутствуют обязательные поля: userId, type, title, message',
      400
    );
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

  return apiSuccess({ notification }, 'Уведомление создано', 201);
}

export const POST = withErrorHandling(
  requireAuth(postHandler),
  'notifications/POST'
);