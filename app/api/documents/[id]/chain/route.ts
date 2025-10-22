import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/chain - Получение полной цепочки документов
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log(`🔗 Получаем полную цепочку документов для ${id}`);

    // Получаем все документы клиента для построения цепочки
    const allDocuments = await getAllClientDocuments(id);
    
    // Строим цепочку связей
    const chain = buildDocumentChain(allDocuments, id);

    console.log(`✅ Построена цепочка из ${chain.length} документов`);

    return NextResponse.json({
      success: true,
      chain,
      total: chain.length
    });

  } catch (error) {
    console.error('❌ Ошибка построения цепочки документов:', error);
    return NextResponse.json(
      { error: 'Ошибка при построении цепочки документов' },
      { status: 500 }
    );
  }
}

// Получение всех документов клиента
async function getAllClientDocuments(documentId: string) {
  // Сначала определяем клиента по документу
  let clientId = null;

  // Проверяем в разных таблицах
  const invoice = await prisma.invoice.findUnique({
    where: { id: documentId },
    select: { client_id: true }
  });

  if (invoice) {
    clientId = invoice.client_id;
  } else {
    const quote = await prisma.quote.findUnique({
      where: { id: documentId },
      select: { client_id: true }
    });

    if (quote) {
      clientId = quote.client_id;
    } else {
      const order = await prisma.order.findUnique({
        where: { id: documentId },
        select: { client_id: true }
      });

      if (order) {
        clientId = order.client_id;
      } else {
        const supplierOrder = await prisma.supplierOrder.findUnique({
          where: { id: documentId },
          include: { order: { select: { client_id: true } } }
        });

        if (supplierOrder) {
          clientId = supplierOrder.order.client_id;
        }
      }
    }
  }

  if (!clientId) {
    return [];
  }

  // Получаем все документы клиента
  const [quotes, invoices, orders, supplierOrders] = await Promise.all([
    prisma.quote.findMany({
      where: { client_id: clientId },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { created_at: 'asc' }
    }),
    prisma.invoice.findMany({
      where: { client_id: clientId },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { created_at: 'asc' }
    }),
    prisma.order.findMany({
      where: { client_id: clientId },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { created_at: 'asc' }
    }),
    prisma.supplierOrder.findMany({
      where: { order: { client_id: clientId } },
      include: { 
        order: { 
          include: { client: { select: { firstName: true, lastName: true } } } 
        } 
      },
      orderBy: { created_at: 'asc' }
    })
  ]);

  return [
    ...quotes.map(q => ({ ...q, documentType: 'quote' })),
    ...invoices.map(inv => ({ ...inv, documentType: 'invoice' })),
    ...orders.map(ord => ({ ...ord, documentType: 'order' })),
    ...supplierOrders.map(so => ({ ...so, documentType: 'supplier_order' }))
  ];
}

// Построение цепочки документов
function buildDocumentChain(allDocuments: any[], startDocumentId: string) {
  const chain = [];
  const visited = new Set();

  // Находим стартовый документ
  const startDoc = allDocuments.find(doc => doc.id === startDocumentId);
  if (!startDoc) {
    return chain;
  }

  // Добавляем стартовый документ
  chain.push({ ...startDoc, position: 0, level: 0 });
  visited.add(startDocumentId);

  // Строим цепочку вперед (производные документы)
  let currentDoc = startDoc;
  let position = 1;
  let level = 0;

  while (currentDoc) {
    let nextDoc = null;

    if (currentDoc.documentType === 'quote') {
      // КП → Счет
      nextDoc = allDocuments.find(doc => 
        doc.documentType === 'invoice' && 
        doc.quote_id === currentDoc.id &&
        !visited.has(doc.id)
      );
    } else if (currentDoc.documentType === 'invoice') {
      // Счет → Заказ
      nextDoc = allDocuments.find(doc => 
        doc.documentType === 'order' && 
        doc.invoice_id === currentDoc.id &&
        !visited.has(doc.id)
      );
    } else if (currentDoc.documentType === 'order') {
      // Заказ → Заказ у поставщика
      nextDoc = allDocuments.find(doc => 
        doc.documentType === 'supplier_order' && 
        doc.order_id === currentDoc.id &&
        !visited.has(doc.id)
      );
    }

    if (nextDoc) {
      chain.push({ ...nextDoc, position, level, parentId: currentDoc.id });
      visited.add(nextDoc.id);
      currentDoc = nextDoc;
      position++;
    } else {
      break;
    }
  }

  // Строим цепочку назад (исходные документы)
  currentDoc = startDoc;
  position = -1;
  level = 0;

  while (currentDoc) {
    let prevDoc = null;

    if (currentDoc.documentType === 'invoice' && currentDoc.quote_id) {
      // Счет ← КП
      prevDoc = allDocuments.find(doc => 
        doc.documentType === 'quote' && 
        doc.id === currentDoc.quote_id &&
        !visited.has(doc.id)
      );
    } else if (currentDoc.documentType === 'order' && currentDoc.invoice_id) {
      // Заказ ← Счет
      prevDoc = allDocuments.find(doc => 
        doc.documentType === 'invoice' && 
        doc.id === currentDoc.invoice_id &&
        !visited.has(doc.id)
      );
    } else if (currentDoc.documentType === 'supplier_order' && currentDoc.order_id) {
      // Заказ у поставщика ← Заказ
      prevDoc = allDocuments.find(doc => 
        doc.documentType === 'order' && 
        doc.id === currentDoc.order_id &&
        !visited.has(doc.id)
      );
    }

    if (prevDoc) {
      chain.unshift({ ...prevDoc, position, level, childId: currentDoc.id });
      visited.add(prevDoc.id);
      currentDoc = prevDoc;
      position--;
    } else {
      break;
    }
  }

  // Сортируем по позиции
  return chain.sort((a, b) => a.position - b.position);
}
