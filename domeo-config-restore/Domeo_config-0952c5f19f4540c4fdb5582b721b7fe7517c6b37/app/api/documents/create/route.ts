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
      // Строгая логика поиска существующего КП - точное совпадение всех полей
      const existingQuote = await prisma.quote.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingQuote) {
        console.log(`✅ Найден существующий КП: ${existingQuote.number} (ID: ${existingQuote.id})`);
        return existingQuote;
      }
    } else if (type === 'invoice') {
      // Строгая логика поиска существующего счета - точное совпадение всех полей
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingInvoice) {
        console.log(`✅ Найден существующий счет: ${existingInvoice.number} (ID: ${existingInvoice.id})`);
        return existingInvoice;
      }
    } else if (type === 'order') {
      // Строгая логика поиска существующего заказа - точное совпадение всех полей
      const existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingOrder) {
        console.log(`✅ Найден существующий заказ: ${existingOrder.number} (ID: ${existingOrder.id})`);
        return existingOrder;
      }
    } else if (type === 'supplier_order') {
      const existingSupplierOrder = await prisma.supplierOrder.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          cart_data: { contains: contentHash }
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingSupplierOrder) {
        console.log(`✅ Найден существующий заказ у поставщика: ${existingSupplierOrder.id}`);
        return existingSupplierOrder;
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
    const quote = await prisma.quote.create({
      data: {
        number: data.number,
        parent_document_id: data.parent_document_id,
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
    const invoice = await prisma.invoice.create({
      data: {
        number: data.number,
        parent_document_id: data.parent_document_id,
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
    const order = await prisma.order.create({
      data: {
        number: data.number,
        parent_document_id: data.parent_document_id,
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

    // Создаем элементы заказа
    for (const item of data.items) {
      await prisma.orderItem.create({
        data: {
          order_id: order.id,
          product_id: item.product_id || 'unknown',
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          notes: item.notes
        }
      });
    }

    return order;
  } else if (type === 'supplier_order') {
    const supplierOrder = await prisma.supplierOrder.create({
      data: {
        parent_document_id: data.parent_document_id,
        cart_session_id: data.cart_session_id,
        executor_id: data.created_by,
        supplier_name: 'Поставщик', // Можно передавать в параметрах
        notes: data.notes,
        cart_data: cartData,
        total_amount: data.total_amount // Добавляем общую сумму
      }
    });

    return supplierOrder;
  }

  throw new Error(`Неизвестный тип документа: ${type}`);
}

// Создание хеша содержимого для сравнения
function createContentHash(clientId: string, items: any[], totalAmount: number): string {
  const content = {
    client_id: clientId,
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      quantity: item.qty || item.quantity,
      unitPrice: item.unitPrice || item.price,
      name: item.name
    })),
    total_amount: totalAmount
  };
  
  // Создаем более длинный и уникальный хеш
  const contentString = JSON.stringify(content);
  const hash = Buffer.from(contentString).toString('base64');
  
  // Берем первые 100 символов для лучшей уникальности
  return hash.substring(0, 100);
}