import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/orders - Получить все заказы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          number: true,
          client_id: true,
          status: true,
          total_amount: true,
          currency: true,
          notes: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phone: true
            }
          },
          order_items: {
            select: {
              id: true,
              product_id: true,
              quantity: true,
              unit_price: true,
              total_price: true,
              notes: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.order.count({ where })
    ]);

    // Форматируем данные заказов
    const processedOrders = orders.map(order => ({
      id: order.id,
      number: order.number,
      clientId: order.client_id,
      clientName: `${order.client.lastName} ${order.client.firstName} ${order.client.middleName || ''}`.trim(),
      status: order.status,
      total: order.total_amount,
      currency: order.currency,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.order_items.map(item => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total_price,
        notes: item.notes
      }))
    }));

    return NextResponse.json({
      success: true,
      orders: processedOrders,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении заказов' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Создать новый заказ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      client_id, 
      status, 
      priority, 
      total_amount, 
      currency, 
      notes, 
      items,
      cart_data
    } = body;

    if (!client_id || !status || !total_amount || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Генерируем номер заказа
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        number: orderNumber,
        client_id,
        created_by: 'system', // Добавляем обязательное поле
        status: status || 'PENDING',
        total_amount: parseFloat(total_amount),
        currency: currency || 'RUB',
        notes,
        cart_data: cart_data ? JSON.stringify(cart_data) : null,
        order_items: {
          create: items.map((item: any) => ({
            product_id: item.productId || 'unknown',
            quantity: parseInt(item.quantity),
            unit_price: parseFloat(item.price),
            total_price: parseFloat(item.price) * parseInt(item.quantity),
            notes: item.notes
          }))
        }
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
        order_items: true
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: order.number,
        clientId: order.client_id,
        clientName: `${order.client.lastName} ${order.client.firstName} ${order.client.middleName || ''}`.trim(),
        status: order.status,
        total: order.total_amount,
        currency: order.currency,
        notes: order.notes,
        createdAt: order.created_at,
        items: order.order_items.map(item => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          price: item.unit_price,
          total: item.total_price,
          notes: item.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании заказа' },
      { status: 500 }
    );
  }
}
