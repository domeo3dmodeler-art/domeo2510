import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes, cartData } = body;
    
    console.log('🚀 Creating supplier order:', { orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes });

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Проверяем, что заказ существует и получаем связанный счет
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        client_id: true, 
        cart_session_id: true,
        number: true // Получаем номер заказа
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Генерируем cart_session_id для группировки документов
    const cartSessionId = order.cart_session_id || generateCartSessionId();
    
    // Ищем связанный счет для получения его номера
    let invoiceNumber = null;
    const relatedInvoice = await prisma.invoice.findFirst({
      where: { 
        parent_document_id: orderId // Связь через parent_document_id
      },
      select: { number: true },
      orderBy: { created_at: 'desc' }
    });
    
    if (relatedInvoice) {
      invoiceNumber = relatedInvoice.number;
      console.log(`📄 Найден связанный счет: ${invoiceNumber}`);
    } else {
      console.log(`⚠️ Связанный счет не найден для заказа: ${orderId}`);
    }
    
    // Проверяем, есть ли уже заказ у поставщика для этого заказа
    const existingSupplierOrder = await prisma.supplierOrder.findFirst({
      where: {
        parent_document_id: orderId,
        cart_session_id: cartSessionId
      },
      orderBy: { created_at: 'desc' }
    });

    let supplierOrder;
    
    if (existingSupplierOrder) {
      // Используем существующий заказ у поставщика
      console.log(`🔄 Используем существующий заказ у поставщика: ${existingSupplierOrder.id}`);
      supplierOrder = existingSupplierOrder;
    } else {
      // Создаем новый заказ у поставщика
      console.log(`🆕 Создаем новый заказ у поставщика для заказа: ${orderId}`);
      // Генерируем номер заказа у поставщика на основе номера счета
      const supplierOrderNumber = invoiceNumber || `SUPPLIER-${Date.now()}`;
      
      // Вычисляем общую сумму из данных корзины
      let totalAmount = 0;
      if (cartData && cartData.items) {
        totalAmount = cartData.items.reduce((sum: number, item: any) => {
          const quantity = item.quantity || item.qty || 1;
          const price = item.unitPrice || item.price || 0;
          return sum + (quantity * price);
        }, 0);
      }

      supplierOrder = await prisma.supplierOrder.create({
        data: {
          number: supplierOrderNumber, // Используем номер счета или генерируем новый
          parent_document_id: orderId,
          cart_session_id: cartSessionId,
          executor_id: order.client_id, // Временно используем client_id как executor_id
          supplier_name: supplierName || 'Поставщик не указан',
          supplier_email: supplierEmail || '',
          supplier_phone: supplierPhone || '',
          status: 'PENDING',
          order_date: new Date(),
          expected_date: expectedDate ? new Date(expectedDate) : null,
          notes: notes || '',
          cart_data: cartData ? JSON.stringify(cartData) : null, // Сохраняем данные корзины
          total_amount: totalAmount // Сохраняем общую сумму
        }
      });
    }

    console.log('✅ Supplier order created:', supplierOrder);

    return NextResponse.json({
      success: true,
      supplierOrder
    });

  } catch (error) {
    console.error('❌ Error creating supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supplierOrders = await prisma.supplierOrder.findMany({
      where: { parent_document_id: orderId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      supplierOrders
    });

  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier orders' },
      { status: 500 }
    );
  }
}
