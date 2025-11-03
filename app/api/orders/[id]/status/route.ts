import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/orders/[id]/status - Изменение статуса заказа
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Валидация переходов статусов
    const validTransitions: Record<string, string[]> = {
      'NEW_PLANNED': ['UNDER_REVIEW'],
      'UNDER_REVIEW': ['AWAITING_MEASUREMENT', 'AWAITING_INVOICE'],
      'AWAITING_MEASUREMENT': ['AWAITING_INVOICE'],
      'AWAITING_INVOICE': ['COMPLETED'],
      'COMPLETED': []
    };

    const allowedStatuses = validTransitions[order.status] || [];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Недопустимый переход статуса из ${order.status} в ${status}` },
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
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Ошибка изменения статуса заказа' },
      { status: 500 }
    );
  }
}

