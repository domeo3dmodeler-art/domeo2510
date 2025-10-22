import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id] - Получение документа по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    console.log(`🔍 Получаем документ с ID: ${id}`);

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице счетов
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        invoice_items: true,
        document_comments: {
          orderBy: { created_at: 'desc' }
        }
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
          quote_items: true,
          document_comments: {
            orderBy: { created_at: 'desc' }
          }
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
            order_items: true,
            document_comments: {
              orderBy: { created_at: 'desc' }
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

    // Получаем историю изменений статуса
    const history = await getDocumentHistory(id, documentType);

    return NextResponse.json({
      ...document,
      type: documentType,
      history
    });

  } catch (error) {
    console.error('❌ Ошибка получения документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении документа' },
      { status: 500 }
    );
  }
}

// Получение истории изменений документа
async function getDocumentHistory(documentId: string, documentType: string) {
  try {
    // Здесь можно добавить логику получения истории изменений
    // Пока возвращаем базовую информацию
    return [
      {
        id: '1',
        action: 'created',
        description: 'Документ создан',
        timestamp: new Date().toISOString(),
        user: 'system'
      }
    ];
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    return [];
  }
}
