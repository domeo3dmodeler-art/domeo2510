import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/siblings - Получение документов из той же корзины
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log(`🔍 Получаем документы из той же корзины для ${id}`);

    // Сначала определяем тип текущего документа и находим его cart_session_id
    let currentDoc = null;
    let currentType = null;
    let cartSessionId = null;

    // Проверяем в разных таблицах
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, cart_session_id: true, client_id: true }
    });

    if (invoice) {
      currentDoc = invoice;
      currentType = 'invoice';
      cartSessionId = invoice.cart_session_id;
    } else {
      const quote = await prisma.quote.findUnique({
        where: { id },
        select: { id: true, cart_session_id: true, client_id: true }
      });

      if (quote) {
        currentDoc = quote;
        currentType = 'quote';
        cartSessionId = quote.cart_session_id;
      } else {
        const order = await prisma.order.findUnique({
          where: { id },
          select: { id: true, cart_session_id: true, client_id: true }
        });

        if (order) {
          currentDoc = order;
          currentType = 'order';
          cartSessionId = order.cart_session_id;
        } else {
          const supplierOrder = await prisma.supplierOrder.findUnique({
            where: { id },
            select: { id: true, cart_session_id: true }
          });

          if (supplierOrder) {
            currentDoc = supplierOrder;
            currentType = 'supplier_order';
            cartSessionId = supplierOrder.cart_session_id;
          }
        }
      }
    }

    if (!currentDoc) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    if (!cartSessionId) {
      console.log(`❌ У документа ${id} нет cart_session_id`);
      return NextResponse.json({
        success: true,
        documents: [],
        message: 'Документ не был создан из корзины'
      });
    }

    console.log(`✅ Найден документ типа ${currentType} с cart_session_id: ${cartSessionId}`);

    // Ищем все документы с тем же cart_session_id
    const [quotes, invoices, orders, supplierOrders] = await Promise.all([
      prisma.quote.findMany({
        where: { cart_session_id: cartSessionId },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'asc' }
      }),
      prisma.invoice.findMany({
        where: { cart_session_id: cartSessionId },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'asc' }
      }),
      prisma.order.findMany({
        where: { cart_session_id: cartSessionId },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { created_at: 'asc' }
      }),
      prisma.supplierOrder.findMany({
        where: { cart_session_id: cartSessionId },
        orderBy: { created_at: 'asc' }
      })
    ]);

    // Объединяем все документы из корзины
    const siblings = [
      ...quotes.map(doc => ({ ...doc, documentType: 'quote' })),
      ...invoices.map(doc => ({ ...doc, documentType: 'invoice' })),
      ...orders.map(doc => ({ ...doc, documentType: 'order' })),
      ...supplierOrders.map(doc => ({ ...doc, documentType: 'supplier_order' }))
    ];

    // Убираем текущий документ из списка
    const filteredSiblings = siblings.filter(doc => doc.id !== id);

    console.log(`✅ Найдено ${filteredSiblings.length} документов из той же корзины`);

    return NextResponse.json({
      success: true,
      cart_session_id: cartSessionId,
      current_document: {
        id: currentDoc.id,
        type: currentType
      },
      documents: filteredSiblings,
      counts: {
        quotes: quotes.length,
        invoices: invoices.length,
        orders: orders.length,
        supplier_orders: supplierOrders.length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения документов из корзины:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении документов из корзины' },
      { status: 500 }
    );
  }
}
