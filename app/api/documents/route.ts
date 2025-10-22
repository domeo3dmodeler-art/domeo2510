import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents - Получение списка всех документов для тестирования
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Получаем список всех документов');

    // Получаем документы из всех таблиц
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
    const allDocuments = [
      ...quotes.map(doc => ({ ...doc, documentType: 'quote' })),
      ...invoices.map(doc => ({ ...doc, documentType: 'invoice' })),
      ...orders.map(doc => ({ ...doc, documentType: 'order' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`✅ Найдено ${allDocuments.length} документов`);

    return NextResponse.json({
      success: true,
      documents: allDocuments,
      counts: {
        quotes: quotes.length,
        invoices: invoices.length,
        orders: orders.length
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
