import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canTransitionTo } from '@/lib/validation/status-transitions';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const VALID_STATUSES = ['PENDING', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED', 'CANCELLED'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;
    
    logger.debug('Updating supplier order status', 'supplier-orders/[id]/status', { id, status, body }, loggingContext);

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: 'Недопустимый статус', 
        details: { 
          validStatuses: VALID_STATUSES, 
          providedStatus: status 
        } 
      }, { status: 400 });
    }

    const existingSupplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
    
    logger.debug('Found supplier order', 'supplier-orders/[id]/status', { supplierOrder: existingSupplierOrder }, loggingContext);

    if (!existingSupplierOrder) {
      logger.warn('Supplier order not found', 'supplier-orders/[id]/status', { id }, loggingContext);
      return NextResponse.json({ error: 'Заказ у поставщика не найден' }, { status: 404 });
    }

    // Получаем роль пользователя из токена для проверки прав
    let userRole: string | null = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = req.cookies.get('auth-token')?.value;
      const authToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : token;
      
      if (authToken) {
        const decoded: any = jwt.verify(authToken, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userRole = decoded.role;
      }
    } catch (tokenError) {
      logger.warn('Не удалось получить роль из токена', 'supplier-orders/[id]/status', { error: tokenError }, loggingContext);
    }

    // Проверяем права на изменение статуса
    if (userRole && !canUserChangeStatus(userRole as any, 'supplier_order', existingSupplierOrder.status)) {
      return NextResponse.json(
        { 
          error: 'Недостаточно прав для изменения статуса',
          details: {
            userRole,
            currentStatus: existingSupplierOrder.status,
            reason: 'Статус заказа у поставщика заблокирован для вашей роли'
          }
        },
        { status: 403 }
      );
    }

    // Валидация переходов статусов через общую функцию
    if (!canTransitionTo('supplier_order', existingSupplierOrder.status, status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый переход статуса',
          details: {
            currentStatus: existingSupplierOrder.status,
            newStatus: status,
            documentType: 'supplier_order'
          }
        },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    logger.debug('Updating supplier order with data', 'supplier-orders/[id]/status', { updateData }, loggingContext);

    const updatedSupplierOrder = await prisma.supplierOrder.update({
      where: { id },
      data: updateData
    });
    
    logger.info('Supplier order updated successfully', 'supplier-orders/[id]/status', { supplierOrder: updatedSupplierOrder }, loggingContext);

    // Сохраняем старый статус для уведомлений
    const oldStatus = existingSupplierOrder.status;

    // Получаем связанные данные для уведомлений
    let parentUser = null;
    if (updatedSupplierOrder.parent_document_id) {
      // Ищем заказ напрямую по parent_document_id
      const order = await prisma.order.findUnique({
        where: { id: updatedSupplierOrder.parent_document_id },
        include: { client: true }
      });
      
      if (order) {
        // Получаем пользователя по created_by
        parentUser = await prisma.user.findUnique({
          where: { id: order.created_by }
        });
        
        // Если пользователь не найден (например, "system"), ищем комплектатора
        if (!parentUser) {
          parentUser = await prisma.user.findFirst({
            where: { role: 'COMPLECTATOR' }
          });
        }
      } else {
        // Если заказа нет, ищем счет
        const invoice = await prisma.invoice.findFirst({
          where: { parent_document_id: updatedSupplierOrder.parent_document_id }
        });
        
        if (invoice) {
          // Получаем пользователя по created_by
          parentUser = await prisma.user.findUnique({
            where: { id: invoice.created_by }
          });
        }
      }
    }

    // Синхронизируем статус со всеми связанными документами
    // SupplierOrder связан с Order через parent_document_id, затем находим Invoice через Order.invoice_id
    if (updatedSupplierOrder.parent_document_id) {
      try {
        // Получаем Order, связанный с SupplierOrder
        const relatedOrder = await prisma.order.findUnique({
          where: { id: updatedSupplierOrder.parent_document_id },
          select: { id: true, invoice_id: true }
        });

        if (relatedOrder && relatedOrder.invoice_id) {
          // Находим Invoice через Order.invoice_id и синхронизируем статусы
          await synchronizeDocumentStatuses(relatedOrder.invoice_id, status, loggingContext);
          logger.info('All document statuses synchronized', 'supplier-orders/[id]/status', { orderId: relatedOrder.id, invoiceId: relatedOrder.invoice_id }, loggingContext);
        } else {
          logger.warn('Order or Invoice not found for synchronization', 'supplier-orders/[id]/status', { 
            supplierOrderId: id,
            parentDocumentId: updatedSupplierOrder.parent_document_id
          }, loggingContext);
        }
      } catch (syncError) {
        logger.error('Error synchronizing document statuses', 'supplier-orders/[id]/status', { error: syncError }, loggingContext);
        // Не прерываем выполнение, если синхронизация не удалась
      }
    }

    // Отправляем уведомления через универсальную функцию
    try {
      // Получаем данные заказа у поставщика для уведомлений
      const supplierOrderForNotification = await prisma.supplierOrder.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          status: true,
          parent_document_id: true
        }
      });

      if (supplierOrderForNotification && supplierOrderForNotification.parent_document_id) {
        // SupplierOrder связан с Order через parent_document_id, находим Invoice через Order.invoice_id
        const relatedOrder = await prisma.order.findUnique({
          where: { id: supplierOrderForNotification.parent_document_id },
          select: { id: true, invoice_id: true, client_id: true }
        });

        let invoice = null;
        let clientId = relatedOrder?.client_id || '';

        if (relatedOrder && relatedOrder.invoice_id) {
          // Получаем связанный Invoice для client_id и number
          invoice = await prisma.invoice.findUnique({
            where: { id: relatedOrder.invoice_id },
            select: {
              id: true,
              number: true,
              client_id: true
            }
          });
          clientId = invoice?.client_id || clientId;
        } else if (relatedOrder) {
          // Если Invoice не найден, используем client_id из Order
          clientId = relatedOrder.client_id;
        }

        logger.debug('Отправка уведомления о смене статуса SupplierOrder', 'supplier-orders/[id]/status', {
          documentId: id,
          documentType: 'supplier_order',
          documentNumber: supplierOrderForNotification.number,
          oldStatus,
          newStatus: status,
          clientId: clientId
        }, loggingContext);
        
        const { sendStatusNotification } = await import('@/lib/notifications/status-notifications');
        await sendStatusNotification(
          id,
          'supplier_order',
          supplierOrderForNotification.number || supplierOrderForNotification.id,
          oldStatus,
          status,
          clientId
        );
        
        logger.info('Уведомление SupplierOrder отправлено успешно', 'supplier-orders/[id]/status', {}, loggingContext);
      } else {
        logger.warn('Could not find supplier order or parent document for notification', 'supplier-orders/[id]/status', { id }, loggingContext);
      }
    } catch (notificationError) {
      logger.error('Не удалось отправить уведомление SupplierOrder', 'supplier-orders/[id]/status', { 
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        stack: notificationError instanceof Error ? notificationError.stack : undefined
      }, loggingContext);
      // Не прерываем выполнение, если не удалось отправить уведомление
    }

    return NextResponse.json({
      success: true,
      message: `Статус заказа у поставщика изменен на "${status}"`,
      supplierOrder: {
        id: updatedSupplierOrder.id,
        status: updatedSupplierOrder.status
      }
    });
  } catch (error: any) {
    logger.error('Error updating supplier order status', 'supplier-orders/[id]/status', { 
      error: error.message,
      stack: error.stack,
      name: error.name,
      supplierOrderId: id
    }, loggingContext);
    return NextResponse.json({ 
      error: 'Ошибка при изменении статуса заказа у поставщика' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    
    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        supplier_name: true, 
        updated_at: true 
      }
    });
    
    if (!supplierOrder) {
      return NextResponse.json({ error: 'Заказ у поставщика не найден' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: supplierOrder.id,
      supplier_name: supplierOrder.supplier_name,
      status: supplierOrder.status,
      updated_at: supplierOrder.updated_at
    });
  } catch (error: any) {
    logger.error('Error fetching supplier order status', 'supplier-orders/[id]/status', { error, supplierOrderId: id }, loggingContext);
    return NextResponse.json({ 
      error: 'Ошибка при получении статуса заказа у поставщика' 
    }, { status: 500 });
  }
}

// Функция синхронизации статусов всех связанных документов
async function synchronizeDocumentStatuses(invoiceId: string, supplierOrderStatus: string, loggingContext?: any) {
  try {
    logger.debug('Синхронизация статусов для счета', 'supplier-orders/[id]/status', { invoiceId, supplierOrderStatus }, loggingContext);

    // Маппинг статусов заказа поставщику на статусы других документов
    const statusMapping: Record<string, { invoice: string; quote: string }> = {
      'ORDERED': {
        invoice: 'ORDERED', 
        quote: 'ACCEPTED'
      },
      'RECEIVED_FROM_SUPPLIER': {
        invoice: 'RECEIVED_FROM_SUPPLIER',
        quote: 'ACCEPTED'
      },
      'COMPLETED': {
        invoice: 'COMPLETED',
        quote: 'ACCEPTED'
      },
      'CANCELLED': {
        invoice: 'CANCELLED',
        quote: 'REJECTED'
      }
    };

    const mappedStatuses = statusMapping[supplierOrderStatus];
    if (!mappedStatuses) {
      logger.warn('Нет маппинга для статуса', 'supplier-orders/[id]/status', { supplierOrderStatus }, loggingContext);
      return;
    }

    // Получаем счет и его связи
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        parent_document_id: true,
        cart_session_id: true,
        client_id: true
      }
    });

    if (!invoice) {
      logger.warn('Счет не найден', 'supplier-orders/[id]/status', { invoiceId }, loggingContext);
      return;
    }

    // Обновляем статус счета
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: mappedStatuses.invoice,
        updated_at: new Date()
      }
    });
    logger.info('Статус счета обновлен', 'supplier-orders/[id]/status', { invoiceId, newStatus: mappedStatuses.invoice }, loggingContext);

    // Обновляем статус связанного КП (если есть)
    if (invoice.parent_document_id) {
      const quote = await prisma.quote.findUnique({
        where: { id: invoice.parent_document_id },
        select: { id: true, number: true, status: true }
      });
      
      if (quote) {
        await prisma.quote.update({
          where: { id: quote.id },
          data: { 
            status: mappedStatuses.quote,
            updated_at: new Date()
          }
        });
        logger.info('Статус КП обновлен', 'supplier-orders/[id]/status', { quoteId: quote.id, quoteNumber: quote.number, newStatus: mappedStatuses.quote }, loggingContext);
      }
    }

    // Дополнительно ищем и обновляем все документы по cart_session_id
    if (invoice.cart_session_id) {
      // Обновляем все счета с той же сессией корзины
      const invoiceUpdateResult = await prisma.invoice.updateMany({
        where: { 
          cart_session_id: invoice.cart_session_id,
          id: { not: invoiceId }
        },
        data: { 
          status: mappedStatuses.invoice,
          updated_at: new Date()
        }
      });
      
      if (invoiceUpdateResult.count > 0) {
        logger.info('Обновлено дополнительных счетов по cart_session_id', 'supplier-orders/[id]/status', { count: invoiceUpdateResult.count, cartSessionId: invoice.cart_session_id }, loggingContext);
      }

      // Обновляем все КП с той же сессией корзины
      const quoteUpdateResult = await prisma.quote.updateMany({
        where: { 
          cart_session_id: invoice.cart_session_id,
          id: { not: invoice.parent_document_id || '' }
        },
        data: { 
          status: mappedStatuses.quote,
          updated_at: new Date()
        }
      });
      
      if (quoteUpdateResult.count > 0) {
        logger.info('Обновлено дополнительных КП по cart_session_id', 'supplier-orders/[id]/status', { count: quoteUpdateResult.count, cartSessionId: invoice.cart_session_id }, loggingContext);
      }
    }

    logger.info('Синхронизация статусов завершена', 'supplier-orders/[id]/status', { invoiceId }, loggingContext);

  } catch (error) {
    logger.error('Ошибка синхронизации статусов', 'supplier-orders/[id]/status', { error, invoiceId }, loggingContext);
    throw error;
  }
}
