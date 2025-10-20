import { NextRequest, NextResponse } from 'next/server';
import { 
  exportDocumentWithPDF, 
  cleanupExportResources 
} from '@/lib/export/puppeteer-generator';
import { prisma } from '@/lib/prisma';

// POST /api/export/fast - Быстрый экспорт документов
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, format, clientId, items, totalAmount } = body;
    
    console.log('🚀 Fast export request:', { 
      type, 
      format, 
      clientId, 
      itemsCount: items.length, 
      totalAmount 
    });

    // Валидация входных данных
    if (!type || !format || !clientId || !items || !Array.isArray(items)) {
      console.error('❌ Validation failed:', { type, format, clientId, items });
      return NextResponse.json(
        { error: 'Неверные параметры запроса' },
        { status: 400 }
      );
    }

    if (!['quote', 'invoice', 'order'].includes(type)) {
      console.error('❌ Invalid document type:', type);
      return NextResponse.json(
        { error: 'Неподдерживаемый тип документа' },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel', 'csv'].includes(format)) {
      console.error('❌ Invalid format:', format);
      return NextResponse.json(
        { error: 'Неподдерживаемый формат экспорта' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      console.error('❌ Empty cart');
      return NextResponse.json(
        { error: 'Корзина пуста' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed, starting export...');

    // Экспортируем документ
    const result = await exportDocumentWithPDF(
      type,
      format,
      clientId,
      items,
      totalAmount
    );

    // Сохраняем данные корзины в документ
    if (result.documentId) {
      try {
        const cartData = {
          items: items,
          totalAmount: totalAmount,
          clientId: clientId,
          generatedAt: new Date().toISOString(),
          format: format,
          type: type
        };

        const cartDataString = JSON.stringify(cartData);

        switch (type) {
          case 'quote':
            await prisma.quote.update({
              where: { id: result.documentId },
              data: { cart_data: cartDataString }
            });
            break;
          
          case 'invoice':
            await prisma.invoice.update({
              where: { id: result.documentId },
              data: { cart_data: cartDataString }
            });
            break;
          
          case 'order':
            await prisma.order.update({
              where: { id: result.documentId },
              data: { cart_data: cartDataString }
            });
            break;
        }

        console.log('✅ Cart data saved to document:', result.documentId);
      } catch (error) {
        console.error('❌ Error saving cart data:', error);
        // Не прерываем процесс, если не удалось сохранить данные корзины
      }
    }

    // Возвращаем файл с информацией о документе
    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
        'X-Document-Id': result.documentId || '',
        'X-Document-Type': result.documentType || '',
        'X-Document-Number': result.documentNumber || '',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Fast export error:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте документа' },
      { status: 500 }
    );
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await cleanupExportResources();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupExportResources();
  process.exit(0);
});
