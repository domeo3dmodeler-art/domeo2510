import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

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
    const items2 = JSON.parse(items2String);
    const normalized2 = normalizeItems(Array.isArray(items2) ? items2 : []);
    
    if (normalized1.length !== normalized2.length) return false;
    
    for (let i = 0; i < normalized1.length; i++) {
      const item1 = normalized1[i];
      const item2 = normalized2[i];
      
      if (item1.type === 'handle' || item2.type === 'handle') {
        if (item1.type !== item2.type ||
            item1.handleId !== item2.handleId ||
            item1.quantity !== item2.quantity ||
            Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
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
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Ошибка сравнения содержимого корзины:', error);
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
    console.log(`🔍 Поиск существующего заказа: родитель: ${parentDocumentId || 'нет'}, корзина: ${cartSessionId || 'нет'}, клиент: ${clientId}, сумма: ${totalAmount}`);

    // Этап 1: Строгий поиск по всем критериям
    let existingOrder = await prisma.order.findFirst({
      where: {
        parent_document_id: parentDocumentId,
        cart_session_id: cartSessionId,
        client_id: clientId,
        // total_amount можно добавить если будет в модели Order
      } as any,
      orderBy: { created_at: 'desc' }
    });

    if (existingOrder) {
      // Для Order нам нужно проверять содержимое через invoice.cart_data
      // или хранить cart_data в Order модели
      // Пока проверяем по другим критериям
      console.log(`✅ Найден существующий заказ (строгое совпадение): ${existingOrder.number} (ID: ${existingOrder.id})`);
      return existingOrder;
    }

    // Этап 2: Поиск по содержимому корзины
    // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента
    const candidates = await prisma.order.findMany({
      where: {
        client_id: clientId,
        parent_document_id: parentDocumentId,
        // total_amount можно добавить если будет в модели Order
      } as any,
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        invoice: {
          select: {
            cart_data: true
          }
        }
      }
    });

    for (const candidate of candidates) {
      // Проверяем содержимое через invoice.cart_data
      if (candidate.invoice?.cart_data && compareCartContent(items, candidate.invoice.cart_data)) {
        console.log(`✅ Найден существующий заказ (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
        return candidate;
      }
    }

    console.log(`❌ Существующий заказ не найден`);
    return null;
  } catch (error) {
    console.error('❌ Ошибка поиска существующего заказа:', error);
    return null;
  }
}

// POST /api/orders - Создание нового заказа
export async function POST(req: NextRequest) {
  try {
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
      total_amount
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

    // Дедубликация: ищем существующий заказ
    const finalCartSessionId = cart_session_id || generateCartSessionId();
    let existingOrder = null;
    
    if (items && total_amount) {
      existingOrder = await findExistingOrder(
        parent_document_id || null,
        finalCartSessionId,
        client_id,
        items,
        total_amount
      );
    }

    let orderNumber: string;
    let orderId: string | null = null;

    if (existingOrder) {
      orderNumber = existingOrder.number;
      orderId = existingOrder.id;
      console.log(`🔄 Используем существующий заказ: ${orderNumber} (ID: ${orderId})`);
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
        const existingOrderForInvoice = await prisma.order.findFirst({
          where: { invoice_id }
        });

        if (existingOrderForInvoice) {
          return NextResponse.json(
            { error: 'Счет уже связан с другим заказом' },
            { status: 400 }
          );
        }
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
          status: 'NEW_PLANNED',
          parent_document_id: parent_document_id || null,
          cart_session_id: finalCartSessionId
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
      console.log(`✅ Заказ создан: ${orderNumber} (ID: ${orderId})`);
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
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Ошибка создания заказа' },
      { status: 500 }
    );
  }
}

// GET /api/orders - Получение списка заказов
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const executor_id = searchParams.get('executor_id');
    const client_id = searchParams.get('client_id');

    // Строим фильтр
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    // Фильтр по executor_id: показываем заказы, где executor_id равен переданному ID ИЛИ null (неназначенные заказы)
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
