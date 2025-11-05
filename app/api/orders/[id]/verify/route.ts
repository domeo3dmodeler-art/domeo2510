import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// POST /api/orders/[id]/verify - Проверка данных заказа
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const body = await req.json();
    const { verification_status, verification_notes } = body;

    if (!verification_status) {
      return NextResponse.json(
        { error: 'verification_status обязателен' },
        { status: 400 }
      );
    }

    if (!['VERIFIED', 'FAILED'].includes(verification_status)) {
      return NextResponse.json(
        { error: 'verification_status должен быть "VERIFIED" или "FAILED"' },
        { status: 400 }
      );
    }

    // Получаем заказ
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            cart_data: true
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

    // Проверяем наличие проекта
    if (!order.project_file_url) {
      return NextResponse.json(
        { 
          error: 'Для проверки требуется загруженный проект/планировка',
          verification_result: {
            has_project: false,
            can_verify: false
          }
        },
        { status: 400 }
      );
    }

    // Извлекаем данные дверей из счета
    let invoiceDoorData: any[] = [];
    if (order.invoice?.cart_data) {
      try {
        const cartData = JSON.parse(order.invoice.cart_data);
        const items = cartData.items || [];
        invoiceDoorData = items.map((item: any) => ({
          width: item.width || 0,
          height: item.height || 0,
          quantity: item.quantity || item.qty || 1,
          name: item.name || item.model || '',
          sku: item.sku_1c || item.id || ''
        }));
      } catch (error) {
        logger.error('Error parsing cart_data', 'orders/[id]/verify', { error }, loggingContext);
      }
    }

    // Извлекаем данные дверей из проекта (door_dimensions)
    const projectDoorData = order.door_dimensions
      ? JSON.parse(order.door_dimensions)
      : [];

    // Сравниваем данные
    const comparisonResult = {
      invoice_items_count: invoiceDoorData.length,
      project_doors_count: projectDoorData.length,
      matches: invoiceDoorData.length === projectDoorData.length,
      details: [] as any[]
    };

    if (invoiceDoorData.length > 0 && projectDoorData.length > 0) {
      for (let i = 0; i < Math.max(invoiceDoorData.length, projectDoorData.length); i++) {
        const invoiceItem = invoiceDoorData[i];
        const projectDoor = projectDoorData[i];

        const detail = {
          index: i + 1,
          invoice: invoiceItem ? {
            width: invoiceItem.width || null,
            height: invoiceItem.height || null,
            quantity: invoiceItem.quantity || null
          } : null,
          project: projectDoor ? {
            width: projectDoor.width || null,
            height: projectDoor.height || null,
            quantity: projectDoor.quantity || null,
            opening_side: projectDoor.opening_side || null,
            latches_count: projectDoor.latches_count || null
          } : null,
          matches: invoiceItem && projectDoor
            ? invoiceItem.width === projectDoor.width &&
              invoiceItem.height === projectDoor.height &&
              invoiceItem.quantity === projectDoor.quantity
            : false
        };

        comparisonResult.details.push(detail);
      }
    }

    // Обновляем статус проверки
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        verification_status,
        verification_notes: verification_notes || null
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true
          }
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      verification_result: {
        ...comparisonResult,
        verification_status,
        verification_notes: verification_notes || null
      }
    });

  } catch (error) {
    logger.error('Error verifying order', 'orders/[id]/verify', { error, orderId: params.id }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка проверки заказа' },
      { status: 500 }
    );
  }
}

