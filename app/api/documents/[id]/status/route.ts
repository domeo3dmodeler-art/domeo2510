import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/documents/[id]/status - Изменение статуса документа
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    console.log(`🔄 Изменение статуса документа ${id} на ${status}`);

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице счетов
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (invoice) {
      document = invoice;
      documentType = 'invoice';
    } else {
      // Проверяем в таблице КП
      const quote = await prisma.quote.findUnique({
        where: { id }
      });

      if (quote) {
        document = quote;
        documentType = 'quote';
      } else {
        // Проверяем в таблице заказов
        const order = await prisma.order.findUnique({
          where: { id }
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

    // Обновляем статус в соответствующей таблице
    let updatedDocument;
    if (documentType === 'invoice') {
      updatedDocument = await prisma.invoice.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    } else if (documentType === 'quote') {
      updatedDocument = await prisma.quote.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    } else if (documentType === 'order') {
      updatedDocument = await prisma.order.update({
        where: { id },
        data: { 
          status,
          updated_at: new Date()
        }
      });
    }

    console.log(`✅ Статус документа ${id} изменен на ${status}`);

    // TODO: Добавить запись в историю изменений
    // await addToHistory(id, documentType, 'status_changed', document.status, status);

    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('❌ Ошибка изменения статуса документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса документа' },
      { status: 500 }
    );
  }
}
