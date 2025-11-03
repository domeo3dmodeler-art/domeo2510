import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Генерация номера заказа в формате "Заказ-XXX"
async function generateOrderNumber(): Promise<string> {
  const lastOrder = await prisma.order.findFirst({
    where: {
      number: {
        startsWith: 'Заказ-'
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastOrder && lastOrder.number.startsWith('Заказ-')) {
    const match = lastOrder.number.match(/^Заказ-(\d+)$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `Заказ-${nextNumber}`;
}

// POST /api/applications - Создание нового заказа
// ⚠️ DEPRECATED: Используйте POST /api/orders напрямую
// Этот endpoint оставлен для обратной совместимости
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoice_id, client_id, lead_number, complectator_id, executor_id } = body;

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id обязателен' },
        { status: 400 }
      );
    }

    // Проверяем существование клиента
    const client = await prisma.client.findUnique({
      where: { id: client_id }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Если есть invoice_id, проверяем существование счета
    if (invoice_id) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoice_id }
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Счет не найден' },
          { status: 404 }
        );
      }

      // Проверяем, что счет уже не связан с другим заказом
      const existingOrder = await prisma.order.findFirst({
        where: { invoice_id: invoice_id }
      });

      if (existingOrder) {
        return NextResponse.json(
          { error: 'Счет уже связан с другим заказом' },
          { status: 400 }
        );
      }
    }

    // Генерируем номер заказа
    let orderNumber = await generateOrderNumber();
    let exists = await prisma.order.findUnique({
      where: { number: orderNumber }
    });

    // Если номер уже существует, генерируем новый
    let counter = 1;
    while (exists) {
      const match = orderNumber.match(/^Заказ-(\d+)$/);
      const baseNumber = match ? parseInt(match[1], 10) : counter;
      orderNumber = `Заказ-${baseNumber + counter}`;
      exists = await prisma.order.findUnique({
        where: { number: orderNumber }
      });
      counter++;
    }

    // Создаем заказ
    const order = await prisma.order.create({
      data: {
        number: orderNumber,
        client_id,
        invoice_id: invoice_id || null,
        lead_number: lead_number || null,
        complectator_id: complectator_id || null,
        executor_id: executor_id || null,
        status: 'NEW_PLANNED'
      },
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
      application: order, // Для обратной совместимости
      order: order
    });

  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Ошибка создания заявки' },
      { status: 500 }
    );
  }
}

// GET /api/applications - Получение списка заказов
// ⚠️ DEPRECATED: Используйте GET /api/orders напрямую
// Этот endpoint оставлен для обратной совместимости
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const executor_id = searchParams.get('executor_id');
    const client_id = searchParams.get('client_id');

    // Строим фильтр
    const where: any = {};

    // Базовые фильтры (AND)
    if (status) {
      where.status = status;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    // Фильтр по executor_id: показываем заявки, где executor_id равен переданному ID ИЛИ null (неназначенные заявки)
    if (executor_id) {
      where.OR = [
        { executor_id: executor_id },
        { executor_id: null }
      ];
    }

    // Получаем заказы
    const orders = await prisma.order.findMany({
      where,
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

    return NextResponse.json({
      success: true,
      applications: formattedOrders, // Для обратной совместимости
      orders: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заказов' },
      { status: 500 }
    );
  }
}

