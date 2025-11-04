import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/documents/[id]/export - Экспорт документа в разных форматах
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'pdf';

    console.log(`📄 Экспорт документа ${id} в формате ${format}`);

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице счетов
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        invoice_items: true
      }
    });

    if (invoice) {
      document = invoice;
      documentType = 'invoice';
    } else {
      // Проверяем в таблице КП
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
          client: true,
          quote_items: true
        }
      });

      if (quote) {
        document = quote;
        documentType = 'quote';
      } else {
    // Проверяем в таблице заказов
        const order = await prisma.order.findUnique({
          where: { id },
          include: {
            client: true,
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                cart_data: true
              }
            }
          }
        });

        if (order) {
          document = order;
          documentType = 'order';
        }
      }
    }

    if (!document) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    console.log(`✅ Найден документ типа ${documentType}: ${document.number}`);

    // Получаем данные корзины из соответствующих полей
    let cartData: any[] = [];
    
    if (documentType === 'quote') {
      // Для Quote используем quote_items или cart_data
      if (document.quote_items && document.quote_items.length > 0) {
        cartData = document.quote_items.map((item: any) => ({
          id: item.product_id,
          name: item.notes || `Товар ${item.product_id}`,
          quantity: item.quantity,
          qty: item.quantity,
          unitPrice: item.unit_price,
          price: item.unit_price,
          total: item.total_price
        }));
      } else if (document.cart_data) {
        try {
          const parsed = typeof document.cart_data === 'string' 
            ? JSON.parse(document.cart_data) 
            : document.cart_data;
          cartData = Array.isArray(parsed) ? parsed : (parsed.items || []);
        } catch (e) {
          console.error('Error parsing quote cart_data:', e);
        }
      }
    } else if (documentType === 'invoice') {
      // Для Invoice используем invoice_items или cart_data
      if (document.invoice_items && document.invoice_items.length > 0) {
        cartData = document.invoice_items.map((item: any) => ({
          id: item.product_id,
          name: item.notes || `Товар ${item.product_id}`,
          quantity: item.quantity,
          qty: item.quantity,
          unitPrice: item.unit_price,
          price: item.unit_price,
          total: item.total_price
        }));
      } else if (document.cart_data) {
        try {
          const parsed = typeof document.cart_data === 'string' 
            ? JSON.parse(document.cart_data) 
            : document.cart_data;
          cartData = Array.isArray(parsed) ? parsed : (parsed.items || []);
        } catch (e) {
          console.error('Error parsing invoice cart_data:', e);
        }
      }
    } else if (documentType === 'order') {
      // Для Order используем cart_data или cart_data из связанного Invoice
      if (document.cart_data) {
        try {
          const parsed = typeof document.cart_data === 'string' 
            ? JSON.parse(document.cart_data) 
            : document.cart_data;
          cartData = Array.isArray(parsed) ? parsed : (parsed.items || []);
        } catch (e) {
          console.error('Error parsing order cart_data:', e);
        }
      } else if (document.invoice?.cart_data) {
        try {
          const parsed = typeof document.invoice.cart_data === 'string' 
            ? JSON.parse(document.invoice.cart_data) 
            : document.invoice.cart_data;
          cartData = Array.isArray(parsed) ? parsed : (parsed.items || []);
        } catch (e) {
          console.error('Error parsing invoice cart_data from order:', e);
        }
      }
    }
    
    if (cartData.length === 0) {
      console.log(`⚠️ Нет данных корзины для документа ${documentType}: ${document.number}`);
      return NextResponse.json(
        { error: 'Нет данных корзины для экспорта' },
        { status: 400 }
      );
    }

    // Формируем данные для экспорта
    const exportData = {
      documentId: document.id,
      documentNumber: document.number,
      documentType: documentType,
      client: document.client,
      items: cartData,
      totalAmount: document.total_amount,
      subtotal: document.subtotal,
      createdAt: document.created_at,
      status: document.status,
      notes: document.notes
    };

    // В зависимости от формата возвращаем соответствующий файл
    if (format === 'pdf') {
      // Используем существующий генератор PDF
      const { exportDocumentWithPDF } = await import('@/lib/export/puppeteer-generator');
      
      // Преобразуем cartData в формат для экспорта
      const itemsForExport = cartData.map((item: any) => ({
        id: item.id || item.product_id,
        productId: item.product_id || item.id,
        name: item.name || item.model || `Товар ${item.id || item.product_id}`,
        model: item.model || item.name,
        qty: item.qty || item.quantity || 1,
        quantity: item.qty || item.quantity || 1,
        unitPrice: item.unitPrice || item.price || item.unit_price || 0,
        price: item.unitPrice || item.price || item.unit_price || 0,
        width: item.width,
        height: item.height,
        color: item.color,
        finish: item.finish,
        type: item.type || 'door',
        sku_1c: item.sku_1c,
        handleId: item.handleId,
        handleName: item.handleName,
        hardwareKitId: item.hardwareKitId,
        hardwareKitName: item.hardwareKitName || item.hardware
      }));
      
      const result = await exportDocumentWithPDF(
        documentType as 'quote' | 'invoice' | 'order',
        format as 'pdf',
        document.client_id,
        itemsForExport,
        document.total_amount || 0,
        document.cart_session_id || null,
        document.parent_document_id || null
      );

      if (result.buffer) {
        return new NextResponse(result.buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${result.filename || document.number}.pdf"`,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Ошибка при генерации PDF' },
          { status: 500 }
        );
      }
    } else if (format === 'excel') {
      // Используем генератор Excel из puppeteer-generator для консистентности
      const { exportDocumentWithPDF } = await import('@/lib/export/puppeteer-generator');
      
      // Преобразуем cartData в формат для экспорта
      const itemsForExport = cartData.map((item: any) => ({
        id: item.id || item.product_id,
        productId: item.product_id || item.id,
        name: item.name || item.model || `Товар ${item.id || item.product_id}`,
        model: item.model || item.name,
        qty: item.qty || item.quantity || 1,
        quantity: item.qty || item.quantity || 1,
        unitPrice: item.unitPrice || item.price || item.unit_price || 0,
        price: item.unitPrice || item.price || item.unit_price || 0,
        width: item.width,
        height: item.height,
        color: item.color,
        finish: item.finish,
        type: item.type || 'door',
        sku_1c: item.sku_1c,
        handleId: item.handleId,
        handleName: item.handleName,
        hardwareKitId: item.hardwareKitId,
        hardwareKitName: item.hardwareKitName || item.hardware
      }));
      
      const result = await exportDocumentWithPDF(
        documentType as 'quote' | 'invoice' | 'order',
        format as 'excel',
        document.client_id,
        itemsForExport,
        document.total_amount || 0,
        document.cart_session_id || null,
        document.parent_document_id || null
      );

      if (result.buffer) {
        return new NextResponse(result.buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.filename || document.number}.xlsx"`,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Ошибка при генерации Excel' },
          { status: 500 }
        );
      }
    } else if (format === 'csv') {
      // Используем генератор CSV из puppeteer-generator для консистентности
      const { exportDocumentWithPDF } = await import('@/lib/export/puppeteer-generator');
      
      // Преобразуем cartData в формат для экспорта
      const itemsForExport = cartData.map((item: any) => ({
        id: item.id || item.product_id,
        productId: item.product_id || item.id,
        name: item.name || item.model || `Товар ${item.id || item.product_id}`,
        model: item.model || item.name,
        qty: item.qty || item.quantity || 1,
        quantity: item.qty || item.quantity || 1,
        unitPrice: item.unitPrice || item.price || item.unit_price || 0,
        price: item.unitPrice || item.price || item.unit_price || 0,
        width: item.width,
        height: item.height,
        color: item.color,
        finish: item.finish,
        type: item.type || 'door',
        sku_1c: item.sku_1c,
        handleId: item.handleId,
        handleName: item.handleName,
        hardwareKitId: item.hardwareKitId,
        hardwareKitName: item.hardwareKitName || item.hardware
      }));
      
      const result = await exportDocumentWithPDF(
        documentType as 'quote' | 'invoice' | 'order',
        format as 'csv',
        document.client_id,
        itemsForExport,
        document.total_amount || 0,
        document.cart_session_id || null,
        document.parent_document_id || null
      );

      if (result.buffer) {
        return new NextResponse(result.buffer, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${result.filename || document.number}.csv"`,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Ошибка при генерации CSV' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Ошибка экспорта документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте документа' },
      { status: 500 }
    );
  }
}

// GET /api/documents/[id]/preview - Предпросмотр документа
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Перенаправляем на страницу предпросмотра
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents/${id}/preview`);
  } catch (error) {
    console.error('❌ Ошибка предпросмотра документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при предпросмотре документа' },
      { status: 500 }
    );
  }
}

// Генерация CSV
function generateCSV(data: any): string {
  const headers = ['Наименование', 'Количество', 'Цена', 'Сумма'];
  const rows = [headers.join(',')];

  data.items.forEach((item: any) => {
    const name = item.type === 'door' 
      ? `Дверь ${item.model?.replace(/DomeoDoors_/g, 'DomeoDoors ').replace(/_/g, ' ')} (${item.finish}, ${item.color}, ${item.width} × ${item.height} мм)`
      : item.type === 'handle' 
        ? (item.handleName || item.name || 'Ручка')
        : (item.name || 'Товар');
    
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    const total = price * quantity;

    rows.push([
      `"${name}"`,
      quantity,
      price,
      total
    ].join(','));
  });

  rows.push(['', '', 'Итого:', data.totalAmount].join(','));

  return rows.join('\n');
}
