import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes, cartData } = body;
    
    // Поддержка как invoiceId, так и orderId для совместимости
    const finalInvoiceId = invoiceId || orderId;
    
    console.log('🚀 Creating supplier order:', { invoiceId: finalInvoiceId, orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes });
    console.log('📦 Received cartData:', cartData);
    console.log('📦 Received cartData type:', typeof cartData);
    console.log('📦 Received cartData items:', cartData?.items);
    console.log('📦 Received cartData items count:', cartData?.items?.length);

    if (!finalInvoiceId) {
      console.error('❌ Missing invoiceId or orderId in request body:', body);
      return NextResponse.json({ error: 'invoiceId or orderId is required' }, { status: 400 });
    }

    // Проверяем, что счет существует
    const invoice = await prisma.invoice.findUnique({
      where: { id: finalInvoiceId },
      select: { 
        id: true, 
        client_id: true, 
        cart_session_id: true,
        number: true,
        total_amount: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Генерируем cart_session_id для группировки документов
    const cartSessionId = invoice.cart_session_id || generateCartSessionId();
    
    // Проверяем, есть ли уже заказ у поставщика для этого счета
    const existingSupplierOrder = await prisma.supplierOrder.findFirst({
      where: {
        parent_document_id: finalInvoiceId,
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
      console.log(`🆕 Создаем новый заказ у поставщика для счета: ${finalInvoiceId}`);
      // Генерируем номер заказа у поставщика на основе номера счета
      const supplierOrderNumber = `SUPPLIER-${invoice.number}`;
      
      // Вычисляем общую сумму из данных корзины или используем сумму счета
      let totalAmount = 0;
      if (cartData && cartData.items && cartData.items.length > 0) {
        totalAmount = cartData.items.reduce((sum: number, item: any) => {
          const quantity = item.quantity || item.qty || 1;
          const price = item.unitPrice || item.price || 0;
          return sum + (quantity * price);
        }, 0);
      }
      
      // Если сумма из корзины равна 0 или корзина пустая, используем сумму счета
      if (totalAmount === 0 && invoice.total_amount > 0) {
        totalAmount = invoice.total_amount;
        console.log(`💰 Используем сумму счета: ${totalAmount}`);
      } else if (totalAmount > 0) {
        console.log(`💰 Используем сумму из корзины: ${totalAmount}`);
      } else {
        console.log(`⚠️ Сумма не определена: корзина=${cartData?.items?.length || 0}, счет=${invoice.total_amount}`);
      }

      supplierOrder = await prisma.supplierOrder.create({
        data: {
          number: supplierOrderNumber,
          parent_document_id: finalInvoiceId,
          cart_session_id: cartSessionId,
          executor_id: invoice.client_id,
          supplier_name: supplierName || 'Поставщик не указан',
          supplier_email: supplierEmail || '',
          supplier_phone: supplierPhone || '',
          status: 'PENDING',
          order_date: new Date(),
          expected_date: expectedDate ? new Date(expectedDate) : null,
          notes: notes || '',
          cart_data: cartData ? JSON.stringify(cartData) : null,
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
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const supplierOrders = await prisma.supplierOrder.findMany({
      where: { parent_document_id: invoiceId },
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
