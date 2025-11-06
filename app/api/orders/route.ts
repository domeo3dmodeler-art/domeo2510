import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// Импортируем функции дедубликации из app/api/documents/create/route.ts
// Для этого нам нужно либо экспортировать их, либо скопировать логику

// Генерация номера заказа в формате "Заказ-XXX" с последовательной нумерацией
async function generateOrderNumber(): Promise<string> {
  // Находим последний номер заказа с форматом "Заказ-XXX"
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
    // Извлекаем номер из строки "Заказ-XXX"
    const match = lastOrder.number.match(/^Заказ-(\d+)$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `Заказ-${nextNumber}`;
}

// Нормализация items для сравнения (из app/api/documents/create/route.ts)
function normalizeItems(items: any[]): any[] {
  return items.map(item => {
    const normalized: any = {
      type: String(item.type || 'door').toLowerCase(),
      style: String(item.style || '').toLowerCase().trim(),
      model: String(item.model || item.name || '').toLowerCase().trim(),
      finish: String(item.finish || '').toLowerCase().trim(),
      color: String(item.color || '').toLowerCase().trim(),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      quantity: Number(item.qty || item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.price || 0),
      hardwareKitId: String(item.hardwareKitId || '').trim(),
      handleId: String(item.handleId || '').trim(),
      sku_1c: String(item.sku_1c || '').trim()
    };
    
    if (normalized.type === 'handle' || item.handleId) {
      return {
        type: 'handle',
        handleId: normalized.handleId,
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice
      };
    }
    
    return normalized;
  }).sort((a, b) => {
    const keyA = `${a.type}:${(a.handleId || a.model || '')}:${a.finish}:${a.color}:${a.width}:${a.height}:${a.hardwareKitId}`;
    const keyB = `${b.type}:${(b.handleId || b.model || '')}:${b.finish}:${b.color}:${b.width}:${b.height}:${b.hardwareKitId}`;
    return keyA.localeCompare(keyB);
  });
}

// Сравнение содержимого корзины (из app/api/documents/create/route.ts)
function compareCartContent(items1: any[], items2String: string | null): boolean {
  try {
    if (!items2String) return false;
    
    const normalized1 = normalizeItems(items1);
    const parsed2 = JSON.parse(items2String);
    
    // cart_data может быть объектом { items: [...], total_amount: ... } или массивом
    const items2 = Array.isArray(parsed2) ? parsed2 : (parsed2.items || []);
    const normalized2 = normalizeItems(items2);
    
    if (normalized1.length !== normalized2.length) {
      logger.debug('Разное количество товаров', 'ORDERS', {
        count1: normalized1.length,
        count2: normalized2.length
      });
      return false;
    }
    
    for (let i = 0; i < normalized1.length; i++) {
      const item1 = normalized1[i];
      const item2 = normalized2[i];
      
      if (item1.type === 'handle' || item2.type === 'handle') {
        if (item1.type !== item2.type ||
            item1.handleId !== item2.handleId ||
            item1.quantity !== item2.quantity ||
            Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
          logger.debug('Ручки не совпадают', 'ORDERS', { item1, item2 });
          return false;
        }
        continue;
      }
      
      if (item1.type !== item2.type || 
          item1.style !== item2.style ||
          item1.model !== item2.model ||
          item1.finish !== item2.finish ||
          item1.color !== item2.color ||
          item1.width !== item2.width ||
          item1.height !== item2.height ||
          item1.hardwareKitId !== item2.hardwareKitId ||
          item1.handleId !== item2.handleId ||
          item1.quantity !== item2.quantity ||
          Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
        logger.debug('Товары не совпадают', 'ORDERS', { item1, item2 });
        return false;
      }
    }
    
    logger.debug('Содержимое корзины совпадает', 'ORDERS');
    return true;
  } catch (error) {
    logger.warn('Ошибка сравнения содержимого корзины', 'ORDERS', { error });
    return false;
  }
}

// Поиск существующего заказа с дедубликацией
async function findExistingOrder(
  parentDocumentId: string | null,
  cartSessionId: string | null,
  clientId: string,
  items: any[],
  totalAmount: number
) {
  try {
    logger.debug('Поиск существующего заказа', 'ORDERS', {
      parentDocumentId: parentDocumentId || 'нет',
      cartSessionId: cartSessionId || 'нет',
      clientId,
      totalAmount
    });

    // ВАЖНО: Order - основной документ, parent_document_id всегда должен быть null
    // Ищем Order только с parent_document_id = null (основной документ из корзины)
    // Если cartSessionId передан, сначала ищем по нему, иначе ищем только по содержимому
    let existingOrder = null;
    
    if (cartSessionId) {
      // Этап 1: Поиск по cart_session_id (если передан)
      existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: null, // Order - основной документ, parent_document_id должен быть null
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' }
      });

      if (existingOrder) {
        // Проверяем содержимое корзины через cart_data в Order
        if (existingOrder.cart_data && compareCartContent(items, existingOrder.cart_data)) {
          logger.debug('Найден существующий заказ (по cart_session_id)', 'ORDERS', {
            orderNumber: existingOrder.number,
            orderId: existingOrder.id,
            cartSessionId
          });
          return existingOrder;
        }
      }
    }

    // Этап 2: Поиск по содержимому корзины (независимо от cart_session_id)
    // ВАЖНО: Ищем только в Order с parent_document_id = null (основные документы)
    // Ищем среди заказов того же клиента с той же суммой
    const candidates = await prisma.order.findMany({
      where: {
        parent_document_id: null, // Только основные Order из корзины
        client_id: clientId,
        total_amount: {
          gte: totalAmount - 0.01,
          lte: totalAmount + 0.01
        }
      } as any,
      orderBy: { created_at: 'desc' },
      take: 20 // Увеличиваем лимит для более тщательного поиска
    });

    logger.debug('Кандидаты для сравнения', 'ORDERS', {
      candidatesCount: candidates.length,
      clientId,
      totalAmount
    });

    for (const candidate of candidates) {
      // Проверяем содержимое через cart_data в Order
      if (candidate.cart_data && compareCartContent(items, candidate.cart_data)) {
        logger.debug('Найден существующий заказ (по содержимому корзины)', 'ORDERS', {
          orderNumber: candidate.number,
          orderId: candidate.id,
          cartSessionId: candidate.cart_session_id
        });
        return candidate;
      }
    }

    logger.debug('Существующий заказ не найден', 'ORDERS');
    return null;
  } catch (error) {
    logger.error('Ошибка поиска существующего заказа', 'ORDERS', { error });
    return null;
  }
}

// POST /api/orders - Создание нового заказа
export async function POST(req: NextRequest) {
  try {
    // Получаем контекст логирования из запроса
    const loggingContext = getLoggingContextFromRequest(req);
    
    // Получаем токен из заголовков или cookie
    let token: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token) {
      const cookies = req.cookies;
      token = cookies.get('auth-token')?.value || cookies.get('domeo-auth-token')?.value || null;
    }

    // Извлекаем информацию о пользователе из токена
    let userId: string | null = null;
    let userRole: string | null = null;
    
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userId = decoded.userId || null;
        userRole = decoded.role || null;
      } catch (jwtError) {
        logger.warn('Ошибка декодирования JWT токена', 'ORDERS', { error: jwtError });
        // Продолжаем без токена (для системных операций)
      }
    }

    const body = await req.json();
    const { 
      invoice_id, 
      client_id, 
      lead_number, 
      complectator_id, 
      executor_id,
      parent_document_id,
      cart_session_id,
      items,
      total_amount,
      notes
    } = body;

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

    // Вычисляем total_amount из items
    const calculatedTotalAmount = items && items.length > 0
      ? items.reduce((sum: number, item: any) => {
          const qty = item.qty || item.quantity || 1;
          const price = item.unitPrice || item.price || 0;
          return sum + (qty * price);
        }, 0)
      : (total_amount || 0);

    // Дедубликация: ищем существующий заказ
    // Order - основной документ, parent_document_id всегда null
    // ВАЖНО: Если cart_session_id не передан, все равно ищем по содержимому корзины
    const finalCartSessionId = cart_session_id || generateCartSessionId();
    let existingOrder = null;
    
    // Сначала ищем по cart_session_id (если передан)
    if (cart_session_id) {
      existingOrder = await findExistingOrder(
        null, // Order - основной документ, parent_document_id = null
        cart_session_id,
        client_id,
        items,
        calculatedTotalAmount
      );
    }
    
    // Если не нашли по cart_session_id, ищем по содержимому корзины
    // Это важно для случаев, когда cart_session_id не передается или генерируется новый
    if (!existingOrder) {
      logger.debug('Поиск по содержимому корзины (без cart_session_id)', 'ORDERS', {
        clientId: client_id,
        totalAmount: calculatedTotalAmount,
        itemsCount: items.length
      });
      
      existingOrder = await findExistingOrder(
        null,
        null, // Не используем cart_session_id для поиска
        client_id,
        items,
        calculatedTotalAmount
      );
    }

    let orderNumber: string;
    let orderId: string | null = null;

    if (existingOrder) {
      orderNumber = existingOrder.number;
      orderId = existingOrder.id;
      logger.info('Используем существующий заказ', 'ORDERS', { orderNumber, orderId }, loggingContext);
    } else {
      // Генерируем номер заказа в формате "Заказ-XXX"
      orderNumber = await generateOrderNumber();
      let exists = await prisma.order.findUnique({
        where: { number: orderNumber }
      });

      // Если номер занят, ищем следующий свободный
      let counter = 1;
      while (exists) {
        // Извлекаем число из номера или используем счетчик
        const match = orderNumber.match(/^Заказ-(\d+)$/);
        const baseNumber = match ? parseInt(match[1], 10) : counter;
        orderNumber = `Заказ-${baseNumber + counter}`;
        exists = await prisma.order.findUnique({
          where: { number: orderNumber }
        });
        counter++;
      }

      // Определяем complectator_id если пользователь - комплектатор
      let complectatorId: string | null = null;
      if (userRole === 'complectator' && userId !== 'system') {
        complectatorId = userId;
      }

      // Создаем заказ (Order - основной документ, parent_document_id = null)
      const order = await prisma.order.create({
        data: {
          number: orderNumber,
          client_id,
          invoice_id: null, // Invoice создается позже на основе Order
          lead_number: client.compilationLeadNumber || null,
          complectator_id: complectatorId,
          executor_id: null,
          status: 'DRAFT', // Комплектатор создает заказ со статусом DRAFT
          parent_document_id: null, // Order - основной документ, parent_document_id всегда null
          cart_session_id: finalCartSessionId,
          cart_data: items && items.length > 0 
            ? JSON.stringify({ items, total_amount: calculatedTotalAmount }) 
            : (items && Array.isArray(items) 
              ? JSON.stringify({ items: [], total_amount: calculatedTotalAmount })
              : null),
          total_amount: calculatedTotalAmount,
          notes: notes || null
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

      orderId = order.id;
      logger.info('Заказ создан', 'ORDERS', { orderNumber, orderId }, loggingContext);
      // Уведомления НЕ отправляются при создании заказа (только при переходе в PAID)
    }

    // Получаем созданный заказ
    const order = await prisma.order.findUnique({
      where: { id: orderId! },
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
      order: order ? {
        id: order.id,
        number: order.number,
        client_id: order.client_id,
        invoice_id: order.invoice_id,
        lead_number: order.lead_number,
        complectator_id: order.complectator_id,
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
      } : null,
      isNew: !existingOrder
    });

  } catch (error) {
    const loggingContext = getLoggingContextFromRequest(req);
    logger.error('Error creating order', 'ORDERS', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка создания заказа' },
      { status: 500 }
    );
  }
}

// GET /api/orders - Получение списка заказов
export async function GET(req: NextRequest) {
  try {
    const loggingContext = getLoggingContextFromRequest(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const executor_id = searchParams.get('executor_id');
    const client_id = searchParams.get('client_id');
    const complectator_id = searchParams.get('complectator_id'); // Для фильтра Руководителя
    const manager_id = searchParams.get('manager_id'); // Для определения, что запрос от Руководителя
    const date_from = searchParams.get('date_from'); // Фильтр по дате от
    const date_to = searchParams.get('date_to'); // Фильтр по дате до

    // Строим фильтр
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    // Фильтр по complectator_id (для Руководителя)
    if (complectator_id) {
      where.complectator_id = complectator_id;
    }

    // Фильтр по датам
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at.gte = new Date(date_from);
      }
      if (date_to) {
        // Добавляем 23:59:59 к дате "до", чтобы включить весь день
        const dateToEnd = new Date(date_to);
        dateToEnd.setHours(23, 59, 59, 999);
        where.created_at.lte = dateToEnd;
      }
    }

    // Фильтр по executor_id: для Исполнителя показываем только заказы со статусом PAID и выше
    // Для Руководителя показываем все заказы
    if (executor_id && !manager_id) {
      // Для Исполнителя: только заказы со статусом PAID и статусами исполнителя
      const executorStatuses = ['PAID', 'NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'];
      where.OR = [
        { 
          executor_id: executor_id,
          status: { in: executorStatuses }
        },
        { 
          executor_id: null,
          status: { in: executorStatuses }
        }
      ];
    }
    // Для Руководителя: все заказы (фильтр не применяется, если manager_id присутствует)

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

    // Получаем информацию об исполнителях если есть executor_id
    const executorIds = orders
      .map(order => order.executor_id)
      .filter((id): id is string => id !== null);

    const executors = executorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: executorIds },
            role: 'executor'
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            middle_name: true
          }
        })
      : [];

    const executorMap = new Map(
      executors.map(e => [e.id, `${e.last_name} ${e.first_name.charAt(0)}.${e.middle_name ? e.middle_name.charAt(0) + '.' : ''}`])
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
      executor_name: order.executor_id ? executorMap.get(order.executor_id) || 'Не указан' : null,
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
      orders: formattedOrders
    });

  } catch (error) {
    const loggingContext = getLoggingContextFromRequest(req);
    logger.error('Error fetching orders', 'ORDERS', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка получения заказов' },
      { status: 500 }
    );
  }
}
