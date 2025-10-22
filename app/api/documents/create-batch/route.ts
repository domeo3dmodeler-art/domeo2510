import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/documents/create-batch - Создание нескольких документов из корзины
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cart_session_id, // ID сессии корзины (обязательно)
      client_id,
      items,
      total_amount,
      subtotal = 0,
      tax_amount = 0,
      notes,
      document_types = ['quote', 'invoice'], // Типы документов для создания
      created_by = 'system'
    } = body;

    console.log(`🆕 Создание документов из корзины: ${document_types.join(', ')}, сессия: ${cart_session_id}`);

    // Валидация
    if (!cart_session_id || !client_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Необходимые поля: cart_session_id, client_id, items' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Создаем каждый тип документа
    for (const type of document_types) {
      try {
        // Проверяем существующий документ
        const existingDocument = await findExistingDocument(type, null, cart_session_id, client_id, items, total_amount);
        
        let documentNumber: string;
        let documentId: string | null = null;

        if (existingDocument) {
          documentNumber = existingDocument.number;
          documentId = existingDocument.id;
          console.log(`🔄 Используем существующий ${type}: ${documentNumber} (ID: ${documentId})`);
        } else {
          documentNumber = `${type.toUpperCase()}-${Date.now()}`;
          console.log(`🆕 Создаем новый ${type}: ${documentNumber}`);
        }

        // Создаем или обновляем документ в БД
        let dbResult;
        if (!existingDocument) {
          dbResult = await createDocumentRecord(type, {
            number: documentNumber,
            parent_document_id: null,
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

    // Создаем хеш содержимого для сравнения
    const contentHash = createContentHash(clientId, items, totalAmount);

    if (type === 'quote') {
      const existingQuote = await prisma.quote.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount,
          cart_data: { contains: contentHash }
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingQuote) {
        console.log(`✅ Найден существующий КП: ${existingQuote.number} (ID: ${existingQuote.id})`);
        return existingQuote;
      }
    } else if (type === 'invoice') {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount,
          cart_data: { contains: contentHash }
        } as any,
        orderBy: { created_at: 'desc' }
      });
      if (existingInvoice) {
        console.log(`✅ Найден существующий счет: ${existingInvoice.number} (ID: ${existingInvoice.id})`);
        return existingInvoice;
      }
    } else if (type === 'order') {
      const existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount,
          cart_data: { contains: contentHash }
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
        cart_data: cartData
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
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      name: item.name
    })),
    total_amount: totalAmount
  };
  
  return Buffer.from(JSON.stringify(content)).toString('base64').substring(0, 50);
}
