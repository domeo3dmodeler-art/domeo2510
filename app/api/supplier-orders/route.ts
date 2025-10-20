import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes, cartData } = body;
    
    console.log('🚀 Creating supplier order:', { orderId, supplierName, supplierEmail, supplierPhone, expectedDate, notes });

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Проверяем, что заказ существует
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, client_id: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Создаем заказ у поставщика
    const supplierOrder = await prisma.supplierOrder.create({
      data: {
        order_id: orderId,
        executor_id: order.client_id, // Временно используем client_id как executor_id
        supplier_name: supplierName || 'Поставщик не указан',
        supplier_email: supplierEmail || '',
        supplier_phone: supplierPhone || '',
        status: 'PENDING',
        order_date: new Date(),
        expected_date: expectedDate ? new Date(expectedDate) : null,
        notes: notes || '',
        cart_data: cartData ? JSON.stringify(cartData) : null // Сохраняем данные корзины
      }
    });

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
      where: { order_id: orderId },
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
