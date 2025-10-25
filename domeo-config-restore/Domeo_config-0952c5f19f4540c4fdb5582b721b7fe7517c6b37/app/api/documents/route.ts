import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents - Получение списка всех документов для тестирования
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const quoteId = searchParams.get('quote_id');

    console.log('🔍 Получаем связанные документы');

    let documents = [];

    if (orderId) {
      // Получаем счета, созданные на основе заказа
      const invoices = await prisma.invoice.findMany({
        where: { parent_document_id: orderId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
      documents = invoices.map(inv => ({ ...inv, documentType: 'invoice' }));
    } else if (quoteId) {
      // Получаем заказы, созданные на основе КП
      const orders = await prisma.order.findMany({
        where: { quote_id: quoteId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
      documents = orders.map(ord => ({ ...ord, documentType: 'order' }));
    } else {
      // Получаем все документы (оригинальная логика)
      const [quotes, invoices, orders] = await Promise.all([
        prisma.quote.findMany({
          take: 5,
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.invoice.findMany({
          take: 5,
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.order.findMany({
          take: 5,
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        })
      ]);

      // Объединяем все документы с указанием типа
      documents = [
        ...quotes.map(doc => ({ ...doc, documentType: 'quote' })),
        ...invoices.map(doc => ({ ...doc, documentType: 'invoice' })),
        ...orders.map(doc => ({ ...doc, documentType: 'order' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    console.log(`✅ Найдено ${documents.length} документов`);

    return NextResponse.json({
      success: true,
      documents,
      counts: {
        quotes: documents.filter(d => d.documentType === 'quote').length,
        invoices: documents.filter(d => d.documentType === 'invoice').length,
        orders: documents.filter(d => d.documentType === 'order').length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения документов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении документов' },
      { status: 500 }
    );
  }
}
