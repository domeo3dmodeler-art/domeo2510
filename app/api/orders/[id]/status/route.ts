import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { canTransitionTo } from '@/lib/validation/status-transitions';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import jwt from 'jsonwebtoken';

// PUT /api/orders/[id]/status - Изменение статуса заказа
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const body = await req.json();
    const { status, notes, require_measurement } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'status обязателен' },
        { status: 400 }
      );
    }

    // Получаем текущий заказ
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
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
      logger.warn('Не удалось получить роль из токена', 'orders/[id]/status', { error: tokenError }, loggingContext);
    }

    // Проверяем права на изменение статуса
    if (userRole && !canUserChangeStatus(userRole as any, 'order', order.status)) {
      return NextResponse.json(
        { 
          error: 'Недостаточно прав для изменения статуса',
          details: {
            userRole,
            currentStatus: order.status,
            reason: 'Статус заказа заблокирован для вашей роли'
          }
        },
        { status: 403 }
      );
    }

    // Валидация переходов статусов через общую функцию
    if (!canTransitionTo('order', order.status, status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый переход статуса',
          details: {
            currentStatus: order.status,
            newStatus: status,
            documentType: 'order'
          }
        },
        { status: 400 }
      );
    }

    // Проверяем обязательность загрузки проекта при переходе в UNDER_REVIEW
    // Получаем полные данные заказа с project_file_url
    const orderWithProject = await prisma.order.findUnique({
      where: { id: params.id },
      select: { project_file_url: true }
    });
    
    if (status === 'UNDER_REVIEW' && !orderWithProject?.project_file_url) {
      return NextResponse.json(
        { error: 'Для перехода в статус "На проверке" требуется загрузить проект/планировку' },
        { status: 400 }
      );
    }

    // Если текущий статус UNDER_REVIEW и переходим в UNDER_REVIEW с require_measurement,
    // определяем следующий статус на основе require_measurement
    let targetStatus = status;
    if (order.status === 'UNDER_REVIEW' && status === 'UNDER_REVIEW' && require_measurement !== undefined) {
      targetStatus = require_measurement ? 'AWAITING_MEASUREMENT' : 'AWAITING_INVOICE';
    }

    // Формируем данные для обновления
    const updateData: any = {
      status: targetStatus
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Обновляем заказ
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
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
        // Invoice связан через order_id, получаем отдельным запросом если нужно
      }
    });

    // TODO: Логирование изменения статуса в DocumentHistory

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    logger.error('Error updating order status', 'orders/[id]/status', { error, orderId: params.id }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка изменения статуса заказа' },
      { status: 500 }
    );
  }
}

