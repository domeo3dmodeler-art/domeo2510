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
          parent_document_id: true,
          cart_session_id: true,
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

    // Получаем информацию о связанных счетах для каждого заказа
    const ordersWithInvoices = await Promise.all(
      orders.map(async (order) => {
        let relatedInvoice = null;
        if (order.parent_document_id) {
          // Ищем счет по parent_document_id
          relatedInvoice = await prisma.invoice.findFirst({
            where: { id: order.parent_document_id },
            select: { id: true, number: true, total_amount: true }
          });
        }
        
        return {
          ...order,
          related_invoice: relatedInvoice
        };
      })
    );

    // Форматируем данные заказов
    const processedOrders = ordersWithInvoices.map(order => ({
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
      relatedInvoice: order.related_invoice,
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
      cart_data,
      parent_document_id,
      cart_session_id,
      prevent_duplicates = true
    } = body;

    if (!client_id || !status || !total_amount || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем существующий заказ (дедупликация)
    let existingOrder = null;
    if (prevent_duplicates) {
      existingOrder = await findExistingOrder(parent_document_id, cart_session_id, client_id, items, total_amount);
    }

    let orderNumber: string;
    let orderId: string | null = null;

    if (existingOrder) {
      orderNumber = existingOrder.number;
      orderId = existingOrder.id;
      console.log(`🔄 Используем существующий заказ: ${orderNumber} (ID: ${orderId})`);
    } else {
      // Генерируем номер заказа
      const orderCount = await prisma.order.count();
      orderNumber = `Заказ-${Date.now()}`;
      console.log(`🆕 Создаем новый заказ: ${orderNumber}`);
    }

    let order;
    if (!existingOrder) {
      order = await prisma.order.create({
        data: {
          number: orderNumber,
          parent_document_id,
          cart_session_id,
          client_id,
          created_by: 'system',
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
              middleName: true,
              phone: true
            }
          },
          order_items: true
        }
      });
      orderId = order.id;
      console.log(`✅ Заказ создан: ${orderNumber} (ID: ${orderId})`);
    } else {
      order = existingOrder;
      orderId = existingOrder.id;
      console.log(`✅ Используем существующий заказ: ${orderNumber}`);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        number: orderNumber,
        status: order.status,
        total_amount: order.total_amount,
        currency: order.currency,
        created_at: order.created_at,
        client: order.client,
        order_items: order.order_items,
        isNew: !existingOrder,
        message: existingOrder ? 'Использован существующий заказ' : 'Создан новый заказ'
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

// Поиск существующего заказа
async function findExistingOrder(
  parentDocumentId: string | null,
  cartSessionId: string | null,
  clientId: string,
  items: any[],
  totalAmount: number
) {
  try {
    console.log(`🔍 Поиск существующего заказа: родитель: ${parentDocumentId || 'нет'}, корзина: ${cartSessionId || 'нет'}, клиент: ${clientId}, сумма: ${totalAmount}`);

    // Создаем хеш содержимого для сравнения (как в основной системе дедублирования)
    const contentHash = createContentHash(clientId, items, totalAmount);

    // Строгая логика поиска существующего заказа - точное совпадение всех полей
    const existingOrder = await prisma.order.findFirst({
      where: {
        parent_document_id: parentDocumentId,
        cart_session_id: cartSessionId,
        client_id: clientId,
        total_amount: totalAmount
      },
      orderBy: { created_at: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true
          }
        },
        order_items: true
      }
    });

    if (existingOrder) {
      console.log(`✅ Найден существующий заказ: ${existingOrder.number} (ID: ${existingOrder.id})`);
      return existingOrder;
    }

    console.log(`❌ Существующий заказ не найден`);
    return null;
  } catch (error) {
    console.error('❌ Ошибка поиска существующего заказа:', error);
    return null;
  }
}

// Создание хеша содержимого для дедупликации (как в основной системе)
function createContentHash(clientId: string, items: any[], totalAmount: number): string {
  const content = {
    clientId,
    items: items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    })),
    totalAmount
  };
  
  return Buffer.from(JSON.stringify(content)).toString('base64');
}
