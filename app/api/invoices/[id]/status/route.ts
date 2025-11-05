// api/invoices/[id]/status/route.ts
// API роут для изменения статуса Счета

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyUsersByRole, notifyUser } from '@/lib/notifications';
import { isStatusBlocked } from '@/lib/validation/status-blocking';
import { getStatusLabel } from '@/lib/utils/status-labels';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/auth/roles';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { canTransitionTo } from '@/lib/validation/status-transitions';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];

// PUT /api/invoices/[id]/status - Изменить статус Счета
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;
    
    logger.debug('Updating invoice status', 'invoices/[id]/status', { id, status, body }, loggingContext);

    // Валидация статуса
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый статус',
          details: {
            validStatuses: VALID_STATUSES,
            providedStatus: status
          }
        },
        { status: 400 }
      );
    }

    // Проверяем существование Счета
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true,
        client_id: true,
        created_by: true,
        number: true
      }
    });

    logger.debug('Found invoice', 'invoices/[id]/status', { invoice: existingInvoice }, loggingContext);

    if (!existingInvoice) {
      logger.warn('Invoice not found', 'invoices/[id]/status', { id }, loggingContext);
      return NextResponse.json(
        { error: 'Счет не найден' },
        { status: 404 }
      );
    }

    // Получаем роль пользователя из токена
    let userRole: UserRole | null = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = req.cookies.get('auth-token')?.value;
      const authToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : token;
      
      if (authToken) {
        const decoded: any = jwt.verify(authToken, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userRole = decoded.role as UserRole;
        logger.debug('User role from token', 'invoices/[id]/status', { userRole }, loggingContext);
      }
    } catch (tokenError) {
      logger.warn('Не удалось получить роль из токена', 'invoices/[id]/status', { error: tokenError }, loggingContext);
    }

    // Проверяем права на изменение статуса по роли
    // Исключение: если статус уже PAID и пользователь пытается установить PAID повторно,
    // разрешаем это для создания заявки (может быть полезно, если заявка не была создана ранее)
    if (userRole && !(status === 'PAID' && existingInvoice.status === 'PAID')) {
      const canChange = canUserChangeStatus(userRole, 'invoice', existingInvoice.status);
      if (!canChange) {
        logger.warn('User does not have permission to change status', 'invoices/[id]/status', { userRole, currentStatus: existingInvoice.status }, loggingContext);
        return NextResponse.json(
          { 
            error: 'Недостаточно прав для изменения статуса',
            details: {
              userRole,
              currentStatus: existingInvoice.status,
              reason: 'Статус счета заблокирован для вашей роли'
            }
          },
          { status: 403 }
        );
      }
    }

    // Валидация переходов статусов через общую функцию
    if (!canTransitionTo('invoice', existingInvoice.status, status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый переход статуса',
          details: {
            currentStatus: existingInvoice.status,
            newStatus: status,
            documentType: 'invoice'
          }
        },
        { status: 400 }
      );
    }

    // Проверяем блокировку статуса
    const isBlocked = await isStatusBlocked(id, 'invoice');
    if (isBlocked) {
      logger.warn('Статус счета заблокирован для ручного изменения', 'invoices/[id]/status', { id }, loggingContext);
      return NextResponse.json(
        { 
          error: 'Статус счета заблокирован для ручного изменения. Статус изменяется автоматически через связанные заказы поставщику.',
          blocked: true,
          currentStatus: getStatusLabel(existingInvoice.status, 'invoice')
        },
        { status: 403 }
      );
    }

    // Сохраняем данные ДО обновления для создания заявки
    const oldStatus = existingInvoice.status;
    const wasPaid = oldStatus === 'PAID';
    const invoiceClientId = existingInvoice.client_id;
    const invoiceCreatedBy = existingInvoice.created_by;
    
    // Получаем данные клиента для lead_number
    let clientLeadNumber: string | null = null;
    try {
      const client = await prisma.client.findUnique({
        where: { id: invoiceClientId },
        select: { compilationLeadNumber: true }
      });
      clientLeadNumber = client?.compilationLeadNumber || null;
    } catch (clientError) {
      logger.warn('Ошибка при получении данных клиента', 'invoices/[id]/status', { error: clientError }, loggingContext);
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status
    };

    logger.debug('Updating invoice with data', 'invoices/[id]/status', { updateData }, loggingContext);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            compilationLeadNumber: true
          }
        }
      }
    });

    logger.info('Invoice updated successfully', 'invoices/[id]/status', { invoice: updatedInvoice }, loggingContext);

    // При переходе Invoice в статус PAID, связанный Order переходит в статус NEW_PLANNED (для исполнителя)
    // При переходе Invoice в другие статусы, синхронизируем со связанным Order
    if (status !== oldStatus) {
      try {
        logger.debug('Синхронизация статуса Order при изменении Invoice', 'invoices/[id]/status', { invoiceId: id, newStatus: status }, loggingContext);
        
        // Находим заказ, связанный с этим счетом через order_id
        const relatedOrder = await prisma.order.findFirst({
          where: { invoice_id: id }
        });

        if (relatedOrder) {
          // Маппинг статусов Invoice на статусы Order
          let orderStatus: string | null = null;
          
          switch (status) {
            case 'PAID':
              // При оплате счета, заказ переходит в статус NEW_PLANNED (для исполнителя)
              orderStatus = 'NEW_PLANNED';
              break;
            case 'ORDERED':
              // При размещении заказа, заказ переходит в AWAITING_INVOICE
              orderStatus = 'AWAITING_INVOICE';
              break;
            case 'RECEIVED_FROM_SUPPLIER':
              // При получении от поставщика, заказ остается в текущем статусе или переходит в COMPLETED
              // Не меняем автоматически, так как Order имеет свою логику
              break;
            case 'COMPLETED':
              // При завершении счета, заказ также завершается
              orderStatus = 'COMPLETED';
              break;
            case 'CANCELLED':
              // При отмене счета, заказ также отменяется
              orderStatus = 'CANCELLED';
              break;
          }

          if (orderStatus && canTransitionTo('order', relatedOrder.status, orderStatus)) {
            await prisma.order.update({
              where: { id: relatedOrder.id },
              data: { status: orderStatus }
            });
            logger.info('Статус заказа синхронизирован', 'invoices/[id]/status', { 
              orderId: relatedOrder.id, 
              oldOrderStatus: relatedOrder.status,
              newOrderStatus: orderStatus 
            }, loggingContext);
          } else if (orderStatus) {
            logger.warn('Недопустимый переход статуса Order при синхронизации', 'invoices/[id]/status', {
              orderId: relatedOrder.id,
              currentOrderStatus: relatedOrder.status,
              targetOrderStatus: orderStatus
            }, loggingContext);
          }
        } else {
          logger.debug('Заказ для этого счета не найден', 'invoices/[id]/status', {}, loggingContext);
        }
      } catch (orderError) {
        logger.error('Ошибка при синхронизации статуса заказа', 'invoices/[id]/status', { error: orderError }, loggingContext);
        // Не прерываем выполнение, если не удалось синхронизировать статус заказа
      }
    }

    // Получаем user_id из токена для истории
    let userId = 'system';
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userId = decoded.userId;
      }
    } catch (tokenError) {
      logger.warn('Не удалось получить user_id из токена', 'invoices/[id]/status', { error: tokenError }, loggingContext);
    }

    // oldStatus уже сохранен выше (строка 114)
    // Отправляем уведомления через универсальную функцию
    try {
      logger.debug('Отправка уведомления о смене статуса', 'invoices/[id]/status', {
        documentId: id,
        documentType: 'invoice',
        documentNumber: existingInvoice.number,
        oldStatus,
        newStatus: status,
        clientId: existingInvoice.client_id
      }, loggingContext);
      
      const { sendStatusNotification } = await import('@/lib/notifications/status-notifications');
      await sendStatusNotification(
        id,
        'invoice',
        existingInvoice.number,
        oldStatus,
        status,
        existingInvoice.client_id || ''
      );
      
      logger.info('Уведомление отправлено успешно', 'invoices/[id]/status', {}, loggingContext);
    } catch (notificationError) {
      logger.error('Не удалось отправить уведомление', 'invoices/[id]/status', { error: notificationError }, loggingContext);
      // Не прерываем выполнение, если не удалось отправить уведомление
    }

    return NextResponse.json({
      success: true,
      message: `Статус счета изменен на "${status}"`,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status
      }
    });

  } catch (error: any) {
    logger.error('Error updating invoice status', 'invoices/[id]/status', { error, details: { message: error.message, stack: error.stack, name: error.name } }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса счета' },
      { status: 500 }
    );
  }
}

// GET /api/invoices/[id]/status - Получить текущий статус Счета
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        number: true,
        updated_at: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Счет не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      updated_at: invoice.updated_at,
      canExport: invoice.status === 'PAID'
    });

  } catch (error: any) {
    logger.error('Error fetching invoice status', 'invoices/[id]/status', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса счета' },
      { status: 500 }
    );
  }
}
