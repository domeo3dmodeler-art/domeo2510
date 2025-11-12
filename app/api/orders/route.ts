import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { apiSuccess, apiError, ApiErrorCode, withErrorHandling } from '@/lib/api/response';
import { NotFoundError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/request-helpers';
import { documentService } from '@/lib/services/document.service';
import { createDocumentRequestSchema } from '@/lib/validation/document.schemas';
import type { CreateDocumentRequest } from '@/lib/types/documents';

// POST /api/orders - Создание нового заказа
async function postHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);
  const body = await req.json();
  
  const { 
    invoice_id, 
    client_id, 
    lead_number, 
    complectator_id, 
    executor_id,
    parent_document_id,
    cart_session_id,
    items = [],
    total_amount,
    notes
  } = body;

  if (!client_id) {
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      'client_id обязателен',
      400
    );
  }

  // Проверяем существование клиента
  const client = await prisma.client.findUnique({
    where: { id: client_id }
  });

  if (!client) {
    throw new NotFoundError('Клиент', client_id);
  }

  // Проверяем, что items не пустой
  if (!items || !Array.isArray(items) || items.length === 0) {
    logger.error('Empty or invalid items array in orders/POST', 'orders/POST', {
      items,
      client_id
    }, loggingContext);
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      'Корзина пуста. Добавьте товары в корзину перед созданием заказа.',
      400
    );
  }

  // Вычисляем total_amount из items
  const calculatedTotalAmount = items.reduce((sum: number, item: any) => {
    const qty = item.qty || item.quantity || 1;
    const price = item.unitPrice || item.price || 0;
    return sum + (qty * price);
  }, 0);

  // Определяем complectator_id если пользователь - комплектатор
  let finalComplectatorId: string | null = null;
  if (user.role === 'complectator' && user.userId !== 'system') {
    finalComplectatorId = user.userId;
  } else if (complectator_id) {
    finalComplectatorId = complectator_id;
  }

  // Подготавливаем данные для DocumentService
  const documentRequest: CreateDocumentRequest = {
    type: 'order',
    parent_document_id: null, // Order - основной документ, parent_document_id всегда null
    cart_session_id: cart_session_id || undefined,
    client_id,
    items: items || [],
    total_amount: calculatedTotalAmount,
    subtotal: calculatedTotalAmount,
    tax_amount: 0,
    notes: notes || undefined,
    prevent_duplicates: true,
    created_by: user.userId || 'system'
  };

  // Валидация через Zod
  const validation = createDocumentRequestSchema.safeParse(documentRequest);
  if (!validation.success) {
    const errors = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    logger.error('Validation error in orders/POST', 'orders/POST', {
      errors: validation.error.errors,
      documentRequest
    }, loggingContext);
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      `Ошибка валидации данных: ${errors}`,
      400
    );
  }

  // Используем DocumentService для создания заказа
  let result;
  try {
    logger.info('Creating order via documentService', 'orders/POST', {
      client_id,
      itemsCount: items.length,
      total_amount: calculatedTotalAmount
    }, loggingContext);
    result = await documentService.createDocument(validation.data);
  } catch (error) {
    logger.error('Error creating document via documentService', 'orders/POST', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      documentRequest: validation.data
    }, loggingContext);
    throw error;
  }

  // Если заказ был создан, обновляем complectator_id и lead_number
  if (result.isNew && result.id) {
    await prisma.order.update({
      where: { id: result.id },
      data: {
        complectator_id: finalComplectatorId,
        lead_number: lead_number || client.compilationLeadNumber || null,
        executor_id: executor_id || null
      }
    });

    // Отправляем уведомления о создании заказа
    try {
      const { notifyDocumentCreated } = await import('@/lib/notifications');
      const updatedOrder = await prisma.order.findUnique({
        where: { id: result.id },
        select: {
          number: true,
          complectator_id: true,
          executor_id: true
        }
      });
      if (updatedOrder) {
        await notifyDocumentCreated(
          'order',
          result.id,
          updatedOrder.number,
          client_id,
          updatedOrder.complectator_id,
          updatedOrder.executor_id
        );
      }
    } catch (notificationError) {
      logger.warn('Не удалось отправить уведомление о создании заказа', 'orders/POST', {
        error: notificationError,
        orderId: result.id
      }, loggingContext);
      // Не прерываем выполнение при ошибке уведомлений
    }
  }

  // Получаем созданный заказ с полными данными
  const order = await prisma.order.findUnique({
    where: { id: result.id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          phone: true,
          address: true
        }
      },
      invoice: {
        select: {
          id: true,
          number: true,
          status: true,
          total_amount: true
        }
      }
    }
  });

  if (!order) {
    throw new NotFoundError('Заказ', result.id);
  }

  // Форматируем данные заказа
  const formattedOrder = {
    id: order.id,
    number: order.number,
    client_id: order.client_id,
    invoice_id: order.invoice_id,
    lead_number: order.lead_number,
    complectator_id: order.complectator_id,
    executor_id: order.executor_id,
    status: order.status,
    project_file_url: order.project_file_url,
    door_dimensions: order.door_dimensions ? (() => {
      try {
        return JSON.parse(order.door_dimensions);
      } catch {
        return null;
      }
    })() : null,
    measurement_done: order.measurement_done,
    project_complexity: order.project_complexity,
    wholesale_invoices: order.wholesale_invoices ? (() => {
      try {
        return JSON.parse(order.wholesale_invoices);
      } catch {
        return [];
      }
    })() : [],
    technical_specs: order.technical_specs ? (() => {
      try {
        return JSON.parse(order.technical_specs);
      } catch {
        return [];
      }
    })() : [],
    verification_status: order.verification_status,
    verification_notes: order.verification_notes,
    notes: order.notes,
    created_at: order.created_at,
    updated_at: order.updated_at,
    client: {
      id: order.client.id,
      firstName: order.client.firstName,
      lastName: order.client.lastName,
      middleName: order.client.middleName,
      phone: order.client.phone,
      address: order.client.address,
      fullName: `${order.client.lastName} ${order.client.firstName}${order.client.middleName ? ' ' + order.client.middleName : ''}`
    },
    invoice: order.invoice
  };

  return apiSuccess(
    {
      order: formattedOrder,
      isNew: result.isNew
    },
    result.isNew ? 'Заказ успешно создан' : 'Использован существующий заказ'
  );
}

export const POST = withErrorHandling(
  requireAuth(postHandler),
  'orders/POST'
);

// GET /api/orders - Получение списка заказов
async function getHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const executor_id = searchParams.get('executor_id');
  const client_id = searchParams.get('client_id');
  const complectator_id = searchParams.get('complectator_id'); // Для фильтра Руководителя
  const manager_id = searchParams.get('manager_id'); // Для определения, что запрос от Руководителя
  const date_from = searchParams.get('date_from'); // Фильтр по дате от
  const date_to = searchParams.get('date_to'); // Фильтр по дате до

  // Строим фильтр
  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (client_id) {
    where.client_id = client_id;
  }

  // Фильтр по complectator_id (для Руководителя)
  if (complectator_id) {
    where.complectator_id = complectator_id;
  }

  // Фильтр по датам
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) {
      (where.created_at as Record<string, unknown>).gte = new Date(date_from);
    }
    if (date_to) {
      // Добавляем 23:59:59 к дате "до", чтобы включить весь день
      const dateToEnd = new Date(date_to);
      dateToEnd.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = dateToEnd;
    }
  }

  // Фильтр по executor_id: для Исполнителя показываем только заказы со статусом PAID и выше
  // Для Руководителя показываем все заказы
  if (executor_id && !manager_id) {
    // Для Исполнителя: только заказы со статусом PAID и статусами исполнителя
    const executorStatuses = ['PAID', 'NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'];
    where.OR = [
      { 
        executor_id: executor_id,
        status: { in: executorStatuses }
      },
      { 
        executor_id: null,
        status: { in: executorStatuses }
      }
    ];
  }
  // Для Руководителя: все заказы (фильтр не применяется, если manager_id присутствует)

  // Получаем заказы
  const orders = await prisma.order.findMany({
    where: where as any,
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          phone: true,
          address: true
        }
      },
      invoice: {
        select: {
          id: true,
          number: true,
          status: true,
          total_amount: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Получаем информацию о комплектаторах если есть complectator_id
  const complectatorIds = orders
    .map(order => order.complectator_id)
    .filter((id): id is string => id !== null);

  const complectators = complectatorIds.length > 0
    ? await prisma.user.findMany({
        where: {
          id: { in: complectatorIds },
          role: 'complectator'
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          middle_name: true
        }
      })
    : [];

  const complectatorMap = new Map(
    complectators.map(c => [c.id, `${c.last_name} ${c.first_name.charAt(0)}.${c.middle_name ? c.middle_name.charAt(0) + '.' : ''}`])
  );

  // Получаем информацию об исполнителях если есть executor_id
  const executorIds = orders
    .map(order => order.executor_id)
    .filter((id): id is string => id !== null);

  const executors = executorIds.length > 0
    ? await prisma.user.findMany({
        where: {
          id: { in: executorIds },
          role: 'executor'
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          middle_name: true
        }
      })
    : [];

  const executorMap = new Map(
    executors.map(e => [e.id, `${e.last_name} ${e.first_name.charAt(0)}.${e.middle_name ? e.middle_name.charAt(0) + '.' : ''}`])
  );

  // Форматируем данные заказов
  const formattedOrders = orders.map(order => ({
    id: order.id,
    number: order.number,
    client_id: order.client_id,
    invoice_id: order.invoice_id,
    lead_number: order.lead_number,
    complectator_id: order.complectator_id,
    complectator_name: order.complectator_id ? complectatorMap.get(order.complectator_id) || 'Не указан' : null,
    executor_id: order.executor_id,
    executor_name: order.executor_id ? executorMap.get(order.executor_id) || 'Не указан' : null,
    status: order.status,
    project_file_url: order.project_file_url,
    door_dimensions: order.door_dimensions ? (() => {
      try {
        return JSON.parse(order.door_dimensions);
      } catch {
        return null;
      }
    })() : null,
    measurement_done: order.measurement_done,
    project_complexity: order.project_complexity,
    wholesale_invoices: order.wholesale_invoices ? (() => {
      try {
        return JSON.parse(order.wholesale_invoices);
      } catch {
        return [];
      }
    })() : [],
    technical_specs: order.technical_specs ? (() => {
      try {
        return JSON.parse(order.technical_specs);
      } catch {
        return [];
      }
    })() : [],
    verification_status: order.verification_status,
    verification_notes: order.verification_notes,
    notes: order.notes,
    cart_data: order.cart_data, // Добавляем cart_data для дедубликации
    total_amount: order.total_amount, // Добавляем total_amount для дедубликации
    created_at: order.created_at,
    updated_at: order.updated_at,
    client: {
      id: order.client.id,
      firstName: order.client.firstName,
      lastName: order.client.lastName,
      middleName: order.client.middleName,
      phone: order.client.phone,
      address: order.client.address,
      fullName: `${order.client.lastName} ${order.client.firstName}${order.client.middleName ? ' ' + order.client.middleName : ''}`
    },
    invoice: order.invoice
  }));

  return apiSuccess({ orders: formattedOrders });
}

export const GET = withErrorHandling(
  requireAuth(getHandler),
  'orders/GET'
);
