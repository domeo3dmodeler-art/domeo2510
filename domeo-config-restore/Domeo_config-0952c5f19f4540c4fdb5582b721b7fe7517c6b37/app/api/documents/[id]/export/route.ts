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
            order_items: true
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
    let cartData = [];
    if (documentType === 'quote' && document.quote_items) {
      cartData = document.quote_items;
    } else if (documentType === 'invoice' && document.invoice_items) {
      cartData = document.invoice_items;
    } else if (documentType === 'order' && document.order_items) {
      cartData = document.order_items;
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
      
      const result = await exportDocumentWithPDF(
        documentType as 'quote' | 'invoice' | 'order',
        document.client_id,
        cartData,
        document.total_amount,
        document.number
      );

      if (result.success && result.buffer) {
        return new NextResponse(result.buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${document.number}.pdf"`,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Ошибка при генерации PDF' },
          { status: 500 }
        );
      }
    } else if (format === 'excel') {
      // Используем существующий генератор Excel
      const { generateExcel } = await import('@/lib/export/excel-generator');
      
      const buffer = await generateExcel(exportData);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${document.number}.xlsx"`,
        },
      });
    } else if (format === 'csv') {
      // Генерируем CSV
      const csvContent = generateCSV(exportData);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${document.number}.csv"`,
        },
      });
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
