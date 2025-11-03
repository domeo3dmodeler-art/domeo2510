import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canUserCreateDocument } from '@/lib/auth/permissions';
import jwt from 'jsonwebtoken';

// POST /api/documents/create - Универсальное создание документов с автоматическими связями
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // 'quote', 'invoice', 'order', 'supplier_order'
      parent_document_id, // ID родительского документа (опционально)
      cart_session_id, // ID сессии корзины для группировки (опционально)
      client_id,
      items,
      total_amount,
      subtotal = 0,
      tax_amount = 0,
      notes,
      prevent_duplicates = true,
      created_by = userId || 'system'
    } = body;

    console.log(`🆕 Создание документа типа ${type}, родитель: ${parent_document_id || 'нет'}`);

    // Получаем пользователя из токена
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;
    const userRole = decoded.role;

    // Проверяем права на создание документа
    if (!canUserCreateDocument(userRole, type)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для создания документа данного типа' },
        { status: 403 }
      );
    }

    // Валидация
    if (!type || !client_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Необходимые поля: type, client_id, items' },
        { status: 400 }
      );
    }

    // Проверяем существующий документ (дедупликация)
    let existingDocument = null;
    if (prevent_duplicates) {
      existingDocument = await findExistingDocument(type, parent_document_id, cart_session_id, client_id, items, total_amount);
    }

    let documentNumber: string;
    let documentId: string | null = null;

    if (existingDocument) {
      documentNumber = existingDocument.number;
      documentId = existingDocument.id;
      console.log(`🔄 Используем существующий документ: ${documentNumber} (ID: ${documentId})`);
    } else {
      const documentNumberPrefix = type === 'quote' ? 'КП' : type === 'invoice' ? 'Счет' : type === 'order' ? 'Заказ' : 'Документ';
      documentNumber = `${documentNumberPrefix}-${Date.now()}`;
      console.log(`🆕 Создаем новый документ: ${documentNumber}`);
    }

    // Создаем или обновляем документ в БД
    let dbResult;
    if (!existingDocument) {
      dbResult = await createDocumentRecord(type, {
        number: documentNumber,
        parent_document_id,
        cart_session_id: cart_session_id,
        client_id,
        items,
        total_amount,
        subtotal,
        tax_amount,
        notes,
        created_by
      });
      documentId = dbResult.id;
      console.log(`✅ Запись в БД создана: ${type} #${dbResult.id}`);
    } else {
      console.log(`✅ Используем существующий документ в БД: ${documentNumber}`);
      dbResult = { id: documentId, type: type };
    }

    return NextResponse.json({
      success: true,
      documentId: documentId,
      documentNumber: documentNumber,
      type: type,
      parent_document_id,
      isNew: !existingDocument,
      message: existingDocument ? 'Использован существующий документ' : 'Создан новый документ'
    });

  } catch (error) {
    console.error('❌ Ошибка создания документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании документа' },
      { status: 500 }
    );
  }
}

// Нормализация items для сравнения (улучшенная версия с учетом всех важных полей)
function normalizeItems(items: any[]): any[] {
  return items.map(item => {
    // Нормализуем основные поля
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
      // Фурнитура и ручки
      hardwareKitId: String(item.hardwareKitId || '').trim(),
      handleId: String(item.handleId || '').trim(),
      // Дополнительные идентификаторы
      sku_1c: String(item.sku_1c || '').trim()
    };
    
    // Для ручек - сравниваем только handleId и quantity
    if (normalized.type === 'handle' || item.handleId) {
      return {
        type: 'handle',
        handleId: normalized.handleId,
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice
      };
    }
    
    // Для дверей - сравниваем все параметры
    return normalized;
  }).sort((a, b) => {
    // Сортируем для консистентного сравнения
    const keyA = `${a.type}:${(a.handleId || a.model || '')}:${a.finish}:${a.color}:${a.width}:${a.height}:${a.hardwareKitId}`;
    const keyB = `${b.type}:${(b.handleId || b.model || '')}:${b.finish}:${b.color}:${b.width}:${b.height}:${b.hardwareKitId}`;
    return keyA.localeCompare(keyB);
  });
}

// Сравнение содержимого корзины
function compareCartContent(items1: any[], items2String: string | null): boolean {
  try {
    if (!items2String) return false;
    
    const normalized1 = normalizeItems(items1);
    const items2 = JSON.parse(items2String);
    const normalized2 = normalizeItems(Array.isArray(items2) ? items2 : []);
    
    if (normalized1.length !== normalized2.length) return false;
    
    // Сравниваем каждый элемент
    for (let i = 0; i < normalized1.length; i++) {
      const item1 = normalized1[i];
      const item2 = normalized2[i];
      
      // Для ручек сравниваем только handleId, quantity и unitPrice
      if (item1.type === 'handle' || item2.type === 'handle') {
        if (item1.type !== item2.type ||
            item1.handleId !== item2.handleId ||
            item1.quantity !== item2.quantity ||
            Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
          return false;
        }
        continue;
      }
      
      // Для дверей сравниваем все важные параметры
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
          Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) { // Допуск на округление
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Ошибка сравнения содержимого корзины:', error);
    return false;
  }
}

// Поиск существующего документа
async function findExistingDocument(
  type: 'quote' | 'invoice' | 'order' | 'supplier_order',
  parentDocumentId: string | null,
  cartSessionId: string | null,
  clientId: string,
  items: any[],
  totalAmount: number
) {
  try {
    console.log(`🔍 Поиск существующего документа: ${type}, родитель: ${parentDocumentId || 'нет'}, корзина: ${cartSessionId || 'нет'}, клиент: ${clientId}, сумма: ${totalAmount}`);

    // Создаем хеш содержимого для сравнения
    const contentHash = createContentHash(clientId, items, totalAmount);

    if (type === 'quote') {
      // Quote теперь создается на основе Order (parent_document_id = orderId)
      // Этап 1: Строгий поиск по всем критериям
      let existingQuote = await prisma.quote.findFirst({
        where: {
          parent_document_id: parentDocumentId, // ID Order
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
      
      if (existingQuote) {
        // Проверяем содержимое
        if (compareCartContent(items, existingQuote.cart_data)) {
          console.log(`✅ Найден существующий КП (строгое совпадение): ${existingQuote.number} (ID: ${existingQuote.id})`);
          return existingQuote;
        }
      }
      
      // Этап 2: Поиск по содержимому корзины, если строгое совпадение не найдено
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента (client_id) - разные клиенты могут иметь одинаковые товары
      const candidates = await prisma.quote.findMany({
        where: {
          client_id: clientId, // Только для того же клиента!
          parent_document_id: parentDocumentId, // ID Order
          // Допуск на округление суммы (0.01)
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10 // Ограничиваем поиск последними 10 документами
      });
      
      // Проверяем содержимое каждого кандидата
      for (const candidate of candidates) {
        if (compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий КП (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
      
    } else if (type === 'invoice') {
      // Этап 1: Строгий поиск по всем критериям
      let existingInvoice = await prisma.invoice.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
      
      if (existingInvoice) {
        // Проверяем содержимое
        if (compareCartContent(items, existingInvoice.cart_data)) {
          console.log(`✅ Найден существующий счет (строгое совпадение): ${existingInvoice.number} (ID: ${existingInvoice.id})`);
          return existingInvoice;
        }
      }
      
      // Этап 2: Поиск по содержимому корзины
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента - разные клиенты могут иметь одинаковые товары
      const candidates = await prisma.invoice.findMany({
        where: {
          client_id: clientId, // Только для того же клиента!
          parent_document_id: parentDocumentId, // ID Order
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
      
      for (const candidate of candidates) {
        if (compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий счет (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
      
    } else if (type === 'order') {
      // Order - основной документ, parent_document_id всегда null
      // Проверяем через cart_data и total_amount в самой модели Order
      let existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: null, // Order - основной документ
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
        // Проверяем содержимое через cart_data в Order
        if (existingOrder.cart_data && compareCartContent(items, existingOrder.cart_data)) {
          console.log(`✅ Найден существующий заказ (строгое совпадение): ${existingOrder.number} (ID: ${existingOrder.id})`);
          return existingOrder;
        }
      }
      
      // Этап 2: Поиск по содержимому корзины
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента
      const candidates = await prisma.order.findMany({
        where: {
          client_id: clientId,
          parent_document_id: null, // Order - основной документ
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
      
      for (const candidate of candidates) {
        // Проверяем содержимое через cart_data в Order
        if (candidate.cart_data && compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий заказ (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
    } else if (type === 'supplier_order') {
      // Для supplier_order используем более простую логику
      const existingSupplierOrder = await prisma.supplierOrder.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId
        } as any,
        orderBy: { created_at: 'desc' }
      });
      
      if (existingSupplierOrder) {
        // Проверяем содержимое
        if (compareCartContent(items, existingSupplierOrder.cart_data)) {
          console.log(`✅ Найден существующий заказ у поставщика: ${existingSupplierOrder.id}`);
          return existingSupplierOrder;
        }
      }
    }

    console.log(`❌ Существующий документ не найден`);
    return null;
  } catch (error) {
    console.error('❌ Ошибка поиска существующего документа:', error);
    return null;
  }
}

// Создание записи документа в БД
async function createDocumentRecord(
  type: 'quote' | 'invoice' | 'order' | 'supplier_order',
  data: {
    number: string;
    parent_document_id: string | null;
    cart_session_id: string | null;
    client_id: string;
    items: any[];
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    notes?: string;
    created_by: string;
  }
) {
  const cartData = JSON.stringify(data.items);
  const contentHash = createContentHash(data.client_id, data.items, data.total_amount);

  if (type === 'quote') {
    // Quote создается на основе Order
    // Если parent_document_id указан, проверяем что это Order
    if (data.parent_document_id) {
      const parentOrder = await prisma.order.findUnique({
        where: { id: data.parent_document_id },
        select: { id: true }
      });
      if (!parentOrder) {
        throw new Error(`Заказ ${data.parent_document_id} не найден. Quote должен создаваться на основе Order.`);
      }
    }
    // Если parent_document_id не указан, можно создать Quote без Order для обратной совместимости
    // но рекомендуется всегда создавать Order первым

    const quote = await prisma.quote.create({
      data: {
        number: data.number,
        parent_document_id: data.parent_document_id, // ID Order или null
        cart_session_id: data.cart_session_id,
        client_id: data.client_id,
        created_by: data.created_by,
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        notes: data.notes,
        cart_data: cartData
      }
    });

    // Создаем элементы КП
    for (const item of data.items) {
      await prisma.quoteItem.create({
        data: {
          quote_id: quote.id,
          product_id: item.product_id || 'unknown',
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          notes: item.notes
        }
      });
    }

    return quote;
  } else if (type === 'invoice') {
    // Invoice создается на основе Order
    // Если parent_document_id указывает на Order, устанавливаем order_id
    let orderId: string | null = null;
    if (data.parent_document_id) {
      // Проверяем, что parent_document_id указывает на Order
      const parentOrder = await prisma.order.findUnique({
        where: { id: data.parent_document_id },
        select: { id: true }
      });
      if (parentOrder) {
        orderId = parentOrder.id;
        // Проверяем, что у Order еще нет Invoice
        const existingInvoiceForOrder = await prisma.invoice.findFirst({
          where: { order_id: orderId }
        });
        if (existingInvoiceForOrder) {
          throw new Error(`У заказа ${data.parent_document_id} уже есть счет ${existingInvoiceForOrder.number}`);
        }
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        number: data.number,
        parent_document_id: data.parent_document_id, // ID Order
        cart_session_id: data.cart_session_id,
        client_id: data.client_id,
        order_id: orderId, // Связь с Order через order_id
        created_by: data.created_by,
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        notes: data.notes,
        cart_data: cartData
      }
    });

    // Если invoice создан для Order, обновляем Order.invoice_id
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { invoice_id: invoice.id }
      });
    }

    // Создаем элементы счета
    for (const item of data.items) {
      await prisma.invoiceItem.create({
        data: {
          invoice_id: invoice.id,
          product_id: item.product_id || 'unknown',
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          notes: item.notes
        }
      });
    }

    return invoice;
  } else if (type === 'order') {
    // Order - основной документ, создается с cart_data и total_amount для дедубликации
    // parent_document_id всегда null для Order из корзины
    const order = await prisma.order.create({
      data: {
        number: data.number,
        parent_document_id: null, // Order - основной документ
        cart_session_id: data.cart_session_id,
        client_id: data.client_id,
        status: 'NEW_PLANNED',
        cart_data: cartData, // Сохраняем cart_data для дедубликации
        total_amount: data.total_amount, // Сохраняем total_amount для дедубликации
        notes: data.notes
      }
    });

    return order;
  } else if (type === 'supplier_order') {
    // SupplierOrder создается на основе Order
    // Если parent_document_id указан, проверяем что это Order
    if (data.parent_document_id) {
      const parentOrder = await prisma.order.findUnique({
        where: { id: data.parent_document_id },
        select: { id: true }
      });
      if (!parentOrder) {
        throw new Error(`Заказ ${data.parent_document_id} не найден. SupplierOrder должен создаваться на основе Order.`);
      }
    }
    
    const supplierOrder = await prisma.supplierOrder.create({
      data: {
        parent_document_id: data.parent_document_id, // ID Order
        cart_session_id: data.cart_session_id,
        executor_id: data.created_by,
        supplier_name: 'Поставщик', // Можно передавать в параметрах
        notes: data.notes,
        cart_data: cartData,
        total_amount: data.total_amount
      }
    });

    return supplierOrder;
  }

  throw new Error(`Неизвестный тип документа: ${type}`);
}

// Создание хеша содержимого для сравнения
function createContentHash(clientId: string, items: any[], totalAmount: number): string {
  // Используем нормализованные items для создания хеша
  const normalized = normalizeItems(items);
  const content = {
    client_id: clientId,
    items: normalized,
    total_amount: totalAmount
  };
  
  // Создаем более длинный и уникальный хеш
  const contentString = JSON.stringify(content);
  const hash = Buffer.from(contentString).toString('base64');
  
  // Берем первые 100 символов для лучшей уникальности
  return hash.substring(0, 100);
}