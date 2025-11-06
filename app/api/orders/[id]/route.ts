import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// GET /api/orders/[id] - Получение заказа по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true,
            objectId: true,
            compilationLeadNumber: true
          }
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            total_amount: true,
            cart_data: true,
            created_at: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Получаем информацию о комплектаторе если есть
    let complectator_name = null;
    if (order.complectator_id) {
      const complectator = await prisma.user.findUnique({
        where: { id: order.complectator_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          middle_name: true
        }
      });

      if (complectator) {
        complectator_name = `${complectator.last_name} ${complectator.first_name.charAt(0)}.${complectator.middle_name ? complectator.middle_name.charAt(0) + '.' : ''}`;
      }
    }

    // Получаем информацию об исполнителе если есть
    let executor_name = null;
    if (order.executor_id) {
      const executor = await prisma.user.findUnique({
        where: { id: order.executor_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          middle_name: true
        }
      });

      if (executor) {
        executor_name = `${executor.last_name} ${executor.first_name.charAt(0)}.${executor.middle_name ? executor.middle_name.charAt(0) + '.' : ''}`;
      }
    }

    // Форматируем данные
    const formattedOrder = {
      id: order.id,
      number: order.number,
      client_id: order.client_id,
      invoice_id: order.invoice_id,
      lead_number: order.lead_number,
      complectator_id: order.complectator_id,
      complectator_name,
      executor_id: order.executor_id,
      executor_name,
      status: order.status,
      project_file_url: order.project_file_url,
      door_dimensions: order.door_dimensions ? JSON.parse(order.door_dimensions) : null,
      measurement_done: order.measurement_done,
      project_complexity: order.project_complexity,
      wholesale_invoices: order.wholesale_invoices ? JSON.parse(order.wholesale_invoices) : [],
      technical_specs: order.technical_specs ? JSON.parse(order.technical_specs) : [],
      verification_status: order.verification_status,
      verification_notes: order.verification_notes,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      cart_data: order.cart_data ? (() => {
        try {
          return typeof order.cart_data === 'string' ? JSON.parse(order.cart_data) : order.cart_data;
        } catch {
          return null;
        }
      })() : null,
      cart_session_id: order.cart_session_id,
      total_amount: order.total_amount,
      client: {
        id: order.client.id,
        firstName: order.client.firstName,
        lastName: order.client.lastName,
        middleName: order.client.middleName,
        phone: order.client.phone,
        address: order.client.address,
        objectId: order.client.objectId,
        compilationLeadNumber: order.client.compilationLeadNumber,
        fullName: `${order.client.lastName} ${order.client.firstName}${order.client.middleName ? ' ' + order.client.middleName : ''}`
      },
      invoice: order.invoice ? {
        ...order.invoice,
        cart_data: order.invoice.cart_data ? (() => {
          try {
            return typeof order.invoice.cart_data === 'string' ? JSON.parse(order.invoice.cart_data) : order.invoice.cart_data;
          } catch {
            return null;
          }
        })() : null
      } : null
    };

    return NextResponse.json({
      success: true,
      order: formattedOrder
    });

  } catch (error) {
    logger.error('Error fetching order', 'orders/[id]/GET', { error, orderId: params.id }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка получения заказа' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Обновление заказа
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const body = await req.json();
    const {
      status,
      project_file_url,
      door_dimensions,
      measurement_done,
      project_complexity,
      wholesale_invoices,
      technical_specs,
      verification_status,
      verification_notes,
      notes,
      executor_id
    } = body;

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Валидация переходов статусов
    if (status && status !== existingOrder.status) {
      // Проверяем обязательность загрузки проекта при переходе в UNDER_REVIEW
      if (status === 'UNDER_REVIEW' && !existingOrder.project_file_url && !project_file_url) {
        return NextResponse.json(
          { error: 'Для перехода в статус "На проверке" требуется загрузить проект/планировку' },
          { status: 400 }
        );
      }

      // Проверяем валидность перехода
      const validTransitions: Record<string, string[]> = {
        'NEW_PLANNED': ['UNDER_REVIEW'],
        'UNDER_REVIEW': ['AWAITING_MEASUREMENT', 'AWAITING_INVOICE'],
        'AWAITING_MEASUREMENT': ['AWAITING_INVOICE'],
        'AWAITING_INVOICE': ['COMPLETED'],
        'COMPLETED': []
      };

      const allowedStatuses = validTransitions[existingOrder.status] || [];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Недопустимый переход статуса из ${existingOrder.status} в ${status}` },
          { status: 400 }
        );
      }
    }

    // Формируем данные для обновления
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (project_file_url !== undefined) updateData.project_file_url = project_file_url;
    if (door_dimensions !== undefined) updateData.door_dimensions = JSON.stringify(door_dimensions);
    if (measurement_done !== undefined) updateData.measurement_done = measurement_done;
    if (project_complexity !== undefined) updateData.project_complexity = project_complexity;
    if (wholesale_invoices !== undefined) updateData.wholesale_invoices = JSON.stringify(wholesale_invoices);
    if (technical_specs !== undefined) updateData.technical_specs = JSON.stringify(technical_specs);
    if (verification_status !== undefined) updateData.verification_status = verification_status;
    if (verification_notes !== undefined) updateData.verification_notes = verification_notes;
    if (notes !== undefined) updateData.notes = notes;
    if (executor_id !== undefined) updateData.executor_id = executor_id;

    // Обновляем заказ
    const order = await prisma.order.update({
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

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    logger.error('Error updating order', 'orders/[id]/PUT', { error, orderId: params.id }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка обновления заказа' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Удаление заказа
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    await prisma.order.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Заказ удален'
    });

  } catch (error) {
    logger.error('Error deleting order', 'orders/[id]/DELETE', { error, orderId: params.id }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка удаления заказа' },
      { status: 500 }
    );
  }
}
