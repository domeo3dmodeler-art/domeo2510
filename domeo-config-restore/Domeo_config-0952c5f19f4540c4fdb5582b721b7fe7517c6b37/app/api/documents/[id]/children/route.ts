import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/children - Получение дочерних документов
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log(`🔍 Получаем дочерние документы для ${id}`);

    const children = [];

    // Ищем дочерние документы во всех таблицах
    const [quotes, invoices, orders, supplierOrders] = await Promise.all([
      prisma.quote.findMany({
        where: { parent_document_id: id },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.invoice.findMany({
        where: { parent_document_id: id },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.order.findMany({
        where: { parent_document_id: id },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.supplierOrder.findMany({
        where: { parent_document_id: id },
        orderBy: { created_at: 'desc' }
      })
    ]);

    // Объединяем все дочерние документы
    children.push(
      ...quotes.map(doc => ({ ...doc, documentType: 'quote' })),
      ...invoices.map(doc => ({ ...doc, documentType: 'invoice' })),
      ...orders.map(doc => ({ ...doc, documentType: 'order' })),
      ...supplierOrders.map(doc => ({ ...doc, documentType: 'supplier_order' }))
    );

    console.log(`✅ Найдено ${children.length} дочерних документов`);

    return NextResponse.json({
      success: true,
      documents: children,
      counts: {
        quotes: quotes.length,
        invoices: invoices.length,
        orders: orders.length,
        supplier_orders: supplierOrders.length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения дочерних документов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении дочерних документов' },
      { status: 500 }
    );
  }
}
