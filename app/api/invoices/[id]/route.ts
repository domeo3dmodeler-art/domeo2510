import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// GET /api/invoices/[id] - Получить счет по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        parent_document_id: true,
        cart_session_id: true,
        client_id: true,
        created_by: true,
        status: true,
        invoice_date: true,
        due_date: true,
        subtotal: true,
        tax_amount: true,
        total_amount: true,
        currency: true,
        notes: true,
        cart_data: true,
        created_at: true,
        updated_at: true,
        client: true,
        invoice_items: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    logger.error('Error fetching invoice', 'invoices/[id]/GET', { error }, loggingContext);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

// PATCH /api/invoices/[id] - Обновить счет
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Проверяем, существует ли счет
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Обновляем счет
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...body,
        // Заменяем order_id на parent_document_id если оно есть
        ...(body.order_id && { parent_document_id: body.order_id }),
        // Удаляем order_id из данных
        order_id: undefined
      },
      include: {
        client: true,
        invoice_items: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice updated successfully',
      invoice: updatedInvoice 
    });
  } catch (error) {
    logger.error('Error updating invoice', 'invoices/[id]/PATCH', { error }, loggingContext);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Удалить счет
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    
    // Проверяем, существует ли счет
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Удаляем счет (cascade удалит связанные записи)
    await prisma.invoice.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    logger.error('Error deleting invoice', 'invoices/[id]/DELETE', { error }, loggingContext);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
