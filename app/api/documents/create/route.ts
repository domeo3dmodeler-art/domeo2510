import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// API для создания документов на основе существующих
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceType, sourceId, targetType, userId, additionalData } = body;
    
    console.log('🔄 Creating document from source:', { sourceType, sourceId, targetType, userId });

    // Получаем исходный документ
    const sourceDocument = await getSourceDocument(sourceType, sourceId);
    if (!sourceDocument) {
      return NextResponse.json({ error: 'Исходный документ не найден' }, { status: 404 });
    }

    let newDocument;
    
    switch (targetType) {
      case 'order':
        newDocument = await createOrderFromQuote(sourceDocument, userId, additionalData);
        break;
      case 'invoice':
        if (sourceType === 'quote') {
          newDocument = await createInvoiceFromQuote(sourceDocument, userId, additionalData);
        } else if (sourceType === 'order') {
          newDocument = await createInvoiceFromOrder(sourceDocument, userId, additionalData);
        }
        break;
      case 'supplier_order':
        newDocument = await createSupplierOrderFromOrder(sourceDocument, userId, additionalData);
        break;
      default:
        return NextResponse.json({ error: 'Неподдерживаемый тип документа' }, { status: 400 });
    }

    // Записываем в историю
    await prisma.documentHistory.create({
      data: {
        document_type: targetType,
        document_id: newDocument.id,
        action: 'created_from',
        new_value: JSON.stringify({ sourceType, sourceId }),
        user_id: userId,
        notes: `Создан на основе ${sourceType} ${sourceId}`
      }
    });

    return NextResponse.json({
      success: true,
      document: newDocument,
      message: `${targetType} успешно создан`
    });

  } catch (error) {
    console.error('❌ Error creating document:', error);
    return NextResponse.json({ error: 'Ошибка при создании документа' }, { status: 500 });
  }
}

// Получение исходного документа
async function getSourceDocument(type: string, id: string) {
  switch (type) {
    case 'quote':
      return await prisma.quote.findUnique({
        where: { id },
        include: { quote_items: true, client: true }
      });
    case 'order':
      return await prisma.order.findUnique({
        where: { id },
        include: { order_items: true, client: true }
      });
    default:
      return null;
  }
}

// Создание заказа из КП
async function createOrderFromQuote(quote: any, userId: string, additionalData: any) {
  const orderNumber = `ORD-${Date.now()}`;
  
  const order = await prisma.order.create({
    data: {
      number: orderNumber,
      quote_id: quote.id,
      client_id: quote.client_id,
      created_by: userId,
      status: 'PENDING',
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      currency: quote.currency,
      notes: additionalData?.notes || quote.notes,
      order_items: {
        create: quote.quote_items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes
        }))
      }
    },
    include: { order_items: true }
  });

  return order;
}

// Создание счета из КП
async function createInvoiceFromQuote(quote: any, userId: string, additionalData: any) {
  const invoiceNumber = `INV-${Date.now()}`;
  
  const invoice = await prisma.invoice.create({
    data: {
      number: invoiceNumber,
      quote_id: quote.id,
      client_id: quote.client_id,
      created_by: userId,
      status: 'DRAFT',
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      currency: quote.currency,
      notes: additionalData?.notes || quote.notes,
      due_date: additionalData?.due_date,
      invoice_items: {
        create: quote.quote_items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes
        }))
      }
    },
    include: { invoice_items: true }
  });

  return invoice;
}

// Создание счета из заказа
async function createInvoiceFromOrder(order: any, userId: string, additionalData: any) {
  const invoiceNumber = `INV-${Date.now()}`;
  
  const invoice = await prisma.invoice.create({
    data: {
      number: invoiceNumber,
      order_id: order.id,
      client_id: order.client_id,
      created_by: userId,
      status: 'DRAFT',
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency,
      notes: additionalData?.notes || order.notes,
      due_date: additionalData?.due_date,
      invoice_items: {
        create: order.order_items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes
        }))
      }
    },
    include: { invoice_items: true }
  });

  return invoice;
}

// Создание заказа у поставщика из заказа
async function createSupplierOrderFromOrder(order: any, userId: string, additionalData: any) {
  const supplierOrder = await prisma.supplierOrder.create({
    data: {
      order_id: order.id,
      executor_id: userId,
      supplier_name: additionalData?.supplier_name || 'Поставщик',
      supplier_email: additionalData?.supplier_email,
      supplier_phone: additionalData?.supplier_phone,
      status: 'PENDING',
      expected_date: additionalData?.expected_date,
      notes: additionalData?.notes
    }
  });

  return supplierOrder;
}

// API для получения истории документа
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get('documentType');
    const documentId = searchParams.get('documentId');
    
    if (!documentType || !documentId) {
      return NextResponse.json({ error: 'documentType и documentId обязательны' }, { status: 400 });
    }

    const history = await prisma.documentHistory.findMany({
      where: {
        document_type: documentType,
        document_id: documentId
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('❌ Error fetching document history:', error);
    return NextResponse.json({ error: 'Ошибка при получении истории документа' }, { status: 500 });
  }
}
