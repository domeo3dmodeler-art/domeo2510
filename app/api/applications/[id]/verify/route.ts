import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';

interface CartItem {
  width?: number;
  height?: number;
  quantity?: number;
  qty?: number;
  name?: string;
  model?: string;
  sku_1c?: string;
  id?: string;
}

interface DoorDimension {
  width: number;
  height: number;
  quantity: number;
  opening_side?: string | null;
  latches_count?: number | null;
}

interface ComparisonDetail {
  index: number;
  invoice: {
    width: number | null;
    height: number | null;
    quantity: number | null;
  } | null;
  project: {
    width: number | null;
    height: number | null;
    quantity: number | null;
    opening_side: string | null;
    latches_count: number | null;
  } | null;
  matches: boolean;
}

// POST /api/applications/[id]/verify - Проверка данных заказа
// ⚠️ DEPRECATED: Используйте POST /api/orders/[id]/verify напрямую
// Этот endpoint оставлен для обратной совместимости
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    let invoiceDoorData: DoorDimension[] = [];
    if (order.invoice?.cart_data) {
      try {
        const cartData = JSON.parse(order.invoice.cart_data) as { items?: CartItem[] };
        // Парсим данные дверей из cart_data
        // Структура cart_data: { items: [{ width, height, quantity/qty, ... }] }
        const items = cartData.items || [];
        invoiceDoorData = items.map((item: CartItem) => ({
          width: item.width || 0,
          height: item.height || 0,
          quantity: item.quantity || item.qty || 1,
          name: item.name || item.model || '',
          sku: item.sku_1c || item.id || ''
        }));
      } catch (error) {
        logger.error('Error parsing cart_data', 'applications/[id]/verify', { id: params.id, error: error instanceof Error ? error.message : String(error) });
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
      details: [] as ComparisonDetail[]
    };

    // Детальное сравнение если есть данные
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
      application: updatedOrder, // Для обратной совместимости
      order: updatedOrder,
      verification_result: {
        ...comparisonResult,
        verification_status,
        verification_notes: verification_notes || null
      }
    });

  } catch (error) {
    logger.error('Error verifying order', 'applications/[id]/verify', error instanceof Error ? { error: error.message, stack: error.stack, id: params.id } : { error: String(error), id: params.id });
    return NextResponse.json(
      { error: 'Ошибка проверки заказа' },
      { status: 500 }
    );
  }
}

