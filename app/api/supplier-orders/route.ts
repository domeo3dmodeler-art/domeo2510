import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes, cartData } = body;
    
    // SupplierOrder теперь создается на основе Order (не Invoice)
    // Поддержка orderId как основного параметра, invoiceId для обратной совместимости
    let finalOrderId = orderId;
    
    // Если передан invoiceId, находим связанный Order
    if (!finalOrderId && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { order_id: true }
      });
      if (invoice && invoice.order_id) {
        finalOrderId = invoice.order_id;
        console.log(`📋 Найден Order ${finalOrderId} для Invoice ${invoiceId}`);
      }
    }
    
    console.log('🚀 Creating supplier order:', { invoiceId, orderId: finalOrderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes });
    console.log('📦 Received cartData:', cartData);

    if (!finalOrderId) {
      console.error('❌ Missing orderId in request body. SupplierOrder должен создаваться на основе Order.', body);
      return NextResponse.json({ error: 'orderId is required. SupplierOrder должен создаваться на основе Order.' }, { status: 400 });
    }

    // Проверяем, что Order существует
    const order = await prisma.order.findUnique({
      where: { id: finalOrderId },
      select: { 
        id: true, 
        client_id: true, 
        cart_session_id: true,
        number: true,
        total_amount: true,
        invoice: {
          select: {
            id: true,
            number: true,
            total_amount: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Генерируем cart_session_id для группировки документов
    const cartSessionId = order.cart_session_id || generateCartSessionId();
    
    // Проверяем, есть ли уже заказ у поставщика для этого Order
    const existingSupplierOrder = await prisma.supplierOrder.findFirst({
      where: {
        parent_document_id: finalOrderId, // Теперь используем orderId
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
      console.log(`🆕 Создаем новый заказ у поставщика для Order: ${finalOrderId}`);
      // Генерируем номер заказа у поставщика на основе номера Order или Invoice
      const sourceNumber = order.invoice?.number || order.number;
      const supplierOrderNumber = `SUPPLIER-${sourceNumber}`;
      
      // Вычисляем общую сумму из данных корзины или используем сумму Order/Invoice
      let totalAmount = 0;
      if (cartData && cartData.items && cartData.items.length > 0) {
        totalAmount = cartData.items.reduce((sum: number, item: any) => {
          const quantity = item.quantity || item.qty || 1;
          const price = item.unitPrice || item.price || 0;
          return sum + (quantity * price);
        }, 0);
      }
      
      // Если сумма из корзины равна 0 или корзина пустая, используем сумму Order или Invoice
      if (totalAmount === 0) {
        if (order.total_amount && order.total_amount > 0) {
          totalAmount = order.total_amount;
          console.log(`💰 Используем сумму Order: ${totalAmount}`);
        } else if (order.invoice?.total_amount && order.invoice.total_amount > 0) {
          totalAmount = order.invoice.total_amount;
          console.log(`💰 Используем сумму Invoice: ${totalAmount}`);
        }
      } else {
        console.log(`💰 Используем сумму из корзины: ${totalAmount}`);
      }

      supplierOrder = await prisma.supplierOrder.create({
        data: {
          number: supplierOrderNumber,
          parent_document_id: finalOrderId, // Теперь используем orderId
          cart_session_id: cartSessionId,
          executor_id: order.client_id,
          supplier_name: supplierName || 'Поставщик не указан',
          supplier_email: supplierEmail || '',
          supplier_phone: supplierPhone || '',
          status: 'PENDING',
          order_date: new Date(),
          expected_date: expectedDate ? new Date(expectedDate) : null,
          notes: notes || '',
          cart_data: cartData ? JSON.stringify(cartData) : (order.cart_data || null),
          total_amount: totalAmount
        }
      });
      
      console.log('💾 Saved supplier order with cart_data:', supplierOrder.cart_data);
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
    const invoiceId = searchParams.get('invoiceId');
    const orderId = searchParams.get('orderId');
    
    // Поддержка как orderId, так и invoiceId для обратной совместимости
    let finalOrderId = orderId;
    
    if (!finalOrderId && invoiceId) {
      // Если передан invoiceId, находим связанный Order
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { order_id: true }
      });
      if (invoice && invoice.order_id) {
        finalOrderId = invoice.order_id;
      }
    }
    
    if (!finalOrderId) {
      return NextResponse.json({ error: 'orderId or invoiceId is required' }, { status: 400 });
    }

    const supplierOrders = await prisma.supplierOrder.findMany({
      where: { parent_document_id: finalOrderId }, // Ищем по orderId
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
