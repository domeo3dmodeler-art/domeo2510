import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

// POST /api/documents/create-batch - Создание нескольких документов из корзины
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cart_session_id, // ID сессии корзины (опционально, будет сгенерирован если не передан)
      client_id,
      items,
      total_amount,
      subtotal = 0,
      tax_amount = 0,
      notes,
      document_types = ['quote', 'invoice'], // Типы документов для создания
      created_by = 'system'
    } = body;

    // Генерируем cart_session_id если не передан
    const finalCartSessionId = cart_session_id || generateCartSessionId();

    console.log(`🆕 Создание документов из корзины: ${document_types.join(', ')}, сессия: ${finalCartSessionId}`);

    // Валидация
    if (!client_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Необходимые поля: client_id, items' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Создаем каждый тип документа
    for (const type of document_types) {
      try {
        // Проверяем существующий документ
        const existingDocument = await findExistingDocument(type, null, finalCartSessionId, client_id, items, total_amount);
        
        let documentNumber: string;
        let documentId: string | null = null;

        if (existingDocument) {
          documentNumber = existingDocument.number;
          documentId = existingDocument.id;
          console.log(`🔄 Используем существующий ${type}: ${documentNumber} (ID: ${documentId})`);
        } else {
          const documentNumberPrefix = type === 'quote' ? 'КП' : type === 'invoice' ? 'Счет' : type === 'order' ? 'Заказ' : 'Документ';
          documentNumber = `${documentNumberPrefix}-${Date.now()}`;
          console.log(`🆕 Создаем новый ${type}: ${documentNumber}`);
        }

        // Создаем или обновляем документ в БД
        let dbResult;
        if (!existingDocument) {
          dbResult = await createDocumentRecord(type, {
            number: documentNumber,
            parent_document_id: null,
            cart_session_id: finalCartSessionId,
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

        results.push({
          type: type,
          documentId: documentId,
          documentNumber: documentNumber,
          isNew: !existingDocument,
          message: existingDocument ? 'Использован существующий документ' : 'Создан новый документ'
        });

      } catch (error) {
        console.error(`❌ Ошибка создания ${type}:`, error);
        errors.push({
          type: type,
          error: error.message || 'Неизвестная ошибка'
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      cart_session_id,
      results,
      errors,
      message: `Создано ${results.length} документов из корзины`
    });

  } catch (error) {
    console.error('❌ Ошибка создания документов из корзины:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании документов из корзины' },
      { status: 500 }
    );
  }
}

// Нормализация items для сравнения
function normalizeItems(items: any[]): any[] {
  return items.map(item => ({
    id: String(item.id || ''),
    type: String(item.type || ''),
    model: String(item.model || item.name || ''),
    quantity: Number(item.qty || item.quantity || 1),
    unitPrice: Number(item.unitPrice || item.price || 0)
  })).sort((a, b) => {
    // Сортируем для консистентного сравнения
    const keyA = `${a.type}:${a.model}:${a.id}`;
    const keyB = `${b.type}:${b.model}:${b.id}`;
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
      
      if (item1.id !== item2.id || 
          item1.type !== item2.type || 
          item1.model !== item2.model ||
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

// Поиск существующего документа (копируем из create/route.ts)
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
        if (compareCartContent(items, existingQuote.cart_data)) {
          console.log(`✅ Найден существующий КП (строгое совпадение): ${existingQuote.number} (ID: ${existingQuote.id})`);
          return existingQuote;
        }
      }
      
      // Этап 2: Поиск по содержимому корзины
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента - разные клиенты могут иметь одинаковые товары
      const quoteCandidates = await prisma.quote.findMany({
        where: {
          client_id: clientId, // Только для того же клиента!
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
      
      for (const candidate of quoteCandidates) {
        if (compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий КП (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
      
    } else if (type === 'invoice') {
      // Этап 1: Строгий поиск
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
        if (compareCartContent(items, existingInvoice.cart_data)) {
          console.log(`✅ Найден существующий счет (строгое совпадение): ${existingInvoice.number} (ID: ${existingInvoice.id})`);
          return existingInvoice;
        }
      }
      
      // Этап 2: Поиск по содержимому
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента - разные клиенты могут иметь одинаковые товары
      const invoiceCandidates = await prisma.invoice.findMany({
        where: {
          client_id: clientId, // Только для того же клиента!
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
      
      for (const candidate of invoiceCandidates) {
        if (compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий счет (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
      
    } else if (type === 'order') {
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
        if (compareCartContent(items, existingOrder.cart_data)) {
          console.log(`✅ Найден существующий заказ (строгое совпадение): ${existingOrder.number} (ID: ${existingOrder.id})`);
          return existingOrder;
        }
      }
      
      // Этап 2: Поиск по содержимому
      // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента - разные клиенты могут иметь одинаковые товары
      const orderCandidates = await prisma.order.findMany({
        where: {
          client_id: clientId, // Только для того же клиента!
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
      
      for (const candidate of orderCandidates) {
        if (compareCartContent(items, candidate.cart_data)) {
          console.log(`✅ Найден существующий заказ (по содержимому): ${candidate.number} (ID: ${candidate.id})`);
          return candidate;
        }
      }
      
    } else if (type === 'supplier_order') {
      const existingSupplierOrder = await prisma.supplierOrder.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingSupplierOrder) {
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

// Создание записи документа в БД (копируем из create/route.ts)
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
        currency: 'RUB',
        notes: data.notes,
        cart_data: cartData
      } as any
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
        currency: 'RUB',
        notes: data.notes,
        cart_data: cartData
      } as any
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
        currency: 'RUB',
        notes: data.notes,
        cart_data: cartData
      } as any
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
      } as any
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
