import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canTransitionTo } from '@/lib/validation/status-transitions';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import { sendStatusNotification } from '@/lib/notifications/status-notifications';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// PATCH /api/documents/[id]/status - Изменение статуса документа
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const { status } = await req.json();

    logger.debug('Изменение статуса документа', 'documents/[id]/status', { id, status }, loggingContext);

    // Получаем пользователя из токена
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;
    const userRole = decoded.role;

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице счетов
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (invoice) {
      document = invoice;
      documentType = 'invoice';
    } else {
      // Проверяем в таблице КП
      const quote = await prisma.quote.findUnique({
        where: { id }
      });

      if (quote) {
        document = quote;
        documentType = 'quote';
      } else {
        // Проверяем в таблице заказов
        const order = await prisma.order.findUnique({
          where: { id }
        });

        if (order) {
          document = order;
          documentType = 'order';
        } else {
          // Проверяем в таблице заказов поставщиков
          const supplierOrder = await prisma.supplierOrder.findUnique({
            where: { id }
          });

          if (supplierOrder) {
            document = supplierOrder;
            documentType = 'supplier_order';
          }
        }
      }
    }

    if (!document) {
      logger.warn('Документ не найден', 'documents/[id]/status', { id }, loggingContext);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    // Проверяем права на изменение статуса
    if (!canUserChangeStatus(userRole, documentType, document.status)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для изменения статуса' },
        { status: 403 }
      );
    }

    // Проверяем возможность перехода статуса
    if (!canTransitionTo(documentType, document.status, status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый переход статуса',
          details: {
            currentStatus: document.status,
            newStatus: status,
            documentType: documentType
          }
        },
        { status: 400 }
      );
    }

    // Сохраняем старый статус для уведомлений
    const oldStatus = document.status;

    // Обновляем документ
    let updatedDocument;
    if (documentType === 'invoice') {
      updatedDocument = await prisma.invoice.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    } else if (documentType === 'quote') {
      updatedDocument = await prisma.quote.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    } else if (documentType === 'order') {
      updatedDocument = await prisma.order.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    } else if (documentType === 'supplier_order') {
      updatedDocument = await prisma.supplierOrder.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    }

    logger.info('Статус документа изменен', 'documents/[id]/status', { id, oldStatus, newStatus: status, documentType }, loggingContext);

    // Отправляем уведомления
    try {
      await sendStatusNotification(
        id,
        documentType,
        document.number || document.id,
        oldStatus,
        status,
        document.client_id
      );
    } catch (notificationError) {
      logger.warn('Не удалось отправить уведомления', 'documents/[id]/status', { error: notificationError }, loggingContext);
      // Не прерываем выполнение, если не удалось отправить уведомления
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    logger.error('Ошибка изменения статуса документа', 'documents/[id]/status', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса документа' },
      { status: 500 }
    );
  }
}