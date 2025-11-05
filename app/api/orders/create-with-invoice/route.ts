import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

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

// POST /api/orders/create-with-invoice - DEPRECATED: Используйте POST /api/orders для создания заказа
// Этот endpoint оставлен для обратной совместимости, но теперь просто создает Order
export async function POST(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
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
      logger.warn('Не удалось получить пользователя из токена', 'orders/create-with-invoice', { error: tokenError }, loggingContext);
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
    logger.debug('Создание заказа из корзины', 'orders/create-with-invoice', { client_id, itemsCount: items.length }, loggingContext);
    
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
        cart_session_id: finalCartSessionId,
        cart_data: items && items.length > 0 
          ? JSON.stringify({ items, total_amount: total_amount || 0 }) 
          : (items && Array.isArray(items) 
            ? JSON.stringify({ items: [], total_amount: total_amount || 0 })
            : null),
        total_amount: total_amount || 0
      }
    });

    logger.info(`Заказ создан: ${orderNumber}`, 'orders/create-with-invoice', { orderId: order.id, orderNumber }, loggingContext);

    // Шаг 2: Создаем Invoice, привязанный к Order
    logger.debug('Создание счета для заказа', 'orders/create-with-invoice', { orderId: order.id }, loggingContext);

    // Возвращаем только созданный Order
    // Invoice создается отдельно через POST /api/invoices или /api/documents/create
    // с parent_document_id = order.id
    return NextResponse.json({
      success: true,
      order: order,
      message: `Заказ ${order.number} создан успешно. Для создания счета используйте POST /api/invoices с parent_document_id = ${order.id}`,
      deprecated: true
    });

  } catch (error) {
    logger.error('Ошибка создания заказа и счета', 'orders/create-with-invoice', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при создании заказа и счета' },
      { status: 500 }
    );
  }
}

