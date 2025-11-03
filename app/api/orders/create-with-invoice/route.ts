import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';
import jwt from 'jsonwebtoken';

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

// POST /api/orders/create-with-invoice - Создание заказа и счета из корзины
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      client_id,
      items,
      total_amount,
      subtotal = 0,
      tax_amount = 0,
      notes,
      parent_document_id,
      cart_session_id
    } = body;

    if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Необходимые поля: client_id, items (непустой массив)' },
        { status: 400 }
      );
    }

    // Получаем текущего пользователя из токена
    let userId = 'system';
    let userRole = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = req.cookies.get('auth-token')?.value;
      const authToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : token;

      if (authToken) {
        const decoded: any = jwt.verify(
          authToken,
          process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars"
        );
        userId = decoded.userId;
        userRole = decoded.role;
      }
    } catch (tokenError) {
      console.warn('⚠️ Не удалось получить пользователя из токена:', tokenError);
    }

    // Получаем данные клиента
    const client = await prisma.client.findUnique({
      where: { id: client_id }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Генерируем cart_session_id для дедубликации
    const finalCartSessionId = cart_session_id || generateCartSessionId();

    // Определяем complectator_id если пользователь - комплектатор
    let complectatorId: string | null = null;
    if (userRole === 'complectator' && userId !== 'system') {
      complectatorId = userId;
    }

    // Шаг 1: Создаем Order
    console.log('📦 Создание заказа из корзины...');
    
    // Генерируем номер заказа
    let orderNumber = await generateOrderNumber();
    let exists = await prisma.order.findUnique({
      where: { number: orderNumber }
    });

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
        lead_number: client.compilationLeadNumber || null,
        complectator_id: complectatorId,
        executor_id: null,
        status: 'NEW_PLANNED',
        parent_document_id: parent_document_id || null,
        cart_session_id: finalCartSessionId
      }
    });

    console.log(`✅ Заказ создан: ${orderNumber} (ID: ${order.id})`);

    // Шаг 2: Создаем Invoice, привязанный к Order
    console.log('🧾 Создание счета для заказа...');

    // Генерируем номер счета
    const invoiceNumber = `Счет-${Date.now()}`;
    
    // Подготавливаем items для счета (преобразуем формат корзины)
    const invoiceItems = items.map((item: any) => ({
      product_id: item.productId || item.id || 'unknown',
      quantity: item.qty || item.quantity || 1,
      unit_price: item.unitPrice || item.price || 0,
      total_price: (item.qty || item.quantity || 1) * (item.unitPrice || item.price || 0),
      notes: item.name || item.model || item.notes || null
    }));

    // Создаем счет
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        client_id,
        order_id: order.id, // Связываем счет с заказом
        created_by: userId,
        status: 'DRAFT',
        subtotal: subtotal || total_amount,
        tax_amount: tax_amount || 0,
        total_amount: total_amount,
        currency: 'RUB',
        notes: notes || `Счет для заказа ${orderNumber}`,
        cart_data: JSON.stringify(items),
        parent_document_id: parent_document_id || null,
        cart_session_id: finalCartSessionId
      },
      include: {
        invoice_items: true
      }
    });

    // Создаем элементы счета
    for (const item of invoiceItems) {
      await prisma.invoiceItem.create({
        data: {
          invoice_id: invoice.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes
        }
      });
    }

    // Обновляем заказ, привязывая к нему счет
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        invoice_id: invoice.id
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

    console.log(`✅ Счет создан: ${invoiceNumber} (ID: ${invoice.id}) для заказа ${orderNumber}`);

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        client_id: updatedOrder.client_id,
        invoice_id: updatedOrder.invoice_id,
        status: updatedOrder.status,
        created_at: updatedOrder.created_at,
        client: updatedOrder.client,
        invoice: updatedOrder.invoice
      },
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        total_amount: invoice.total_amount,
        order_id: invoice.order_id
      },
      message: `Заказ ${orderNumber} и счет ${invoiceNumber} созданы успешно`
    });

  } catch (error) {
    console.error('❌ Ошибка создания заказа и счета:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании заказа и счета' },
      { status: 500 }
    );
  }
}

