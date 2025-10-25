import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/supplier-orders/[id] - Получить заказ у поставщика по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        parent_document_id: true,
        client_id: true,
        created_by: true,
        status: true,
        order_date: true,
        delivery_date: true,
        subtotal: true,
        tax_amount: true,
        total_amount: true,
        currency: true,
        notes: true,
        cart_data: true,
        created_at: true,
        updated_at: true,
        client: true,
        order: true
      }
    });

    if (!supplierOrder) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 });
    }

    return NextResponse.json({ supplierOrder });
  } catch (error) {
    console.error('Error fetching supplier order:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier order' }, { status: 500 });
  }
}

// PATCH /api/supplier-orders/[id] - Обновить заказ у поставщика
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Проверяем, существует ли заказ у поставщика
    const existingSupplierOrder = await prisma.supplierOrder.findUnique({
      where: { id }
    });

    if (!existingSupplierOrder) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 });
    }

    // Обновляем заказ у поставщика
    const updatedSupplierOrder = await prisma.supplierOrder.update({
      where: { id },
      data: body,
      include: {
        client: true,
        order: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Supplier order updated successfully',
      supplierOrder: updatedSupplierOrder 
    });
  } catch (error) {
    console.error('Error updating supplier order:', error);
    return NextResponse.json({ error: 'Failed to update supplier order' }, { status: 500 });
  }
}

// DELETE /api/supplier-orders/[id] - Удалить заказ у поставщика
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Проверяем, существует ли заказ у поставщика
    const existingSupplierOrder = await prisma.supplierOrder.findUnique({
      where: { id }
    });

    if (!existingSupplierOrder) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 });
    }

    // Удаляем заказ у поставщика (cascade удалит связанные записи)
    await prisma.supplierOrder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Supplier order deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier order:', error);
    return NextResponse.json({ error: 'Failed to delete supplier order' }, { status: 500 });
  }
}
