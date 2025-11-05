// api/quotes/[id]/route.ts
// API роут для операций с отдельным КП

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// GET /api/quotes/[id] - Получить КП по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        client_id: true,
        created_by: true,
        status: true,
        valid_until: true,
        subtotal: true,
        tax_amount: true,
        total_amount: true,
        currency: true,
        notes: true,
        terms: true,
        cart_data: true,
        created_at: true,
        updated_at: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true
          }
        },
        quote_items: {
          select: {
            id: true,
            product_id: true,
            quantity: true,
            unit_price: true,
            total_price: true,
            notes: true
          }
        }
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      quote: {
        id: quote.id,
        number: quote.number,
        client_id: quote.client_id,
        created_by: quote.created_by,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        terms: quote.terms,
        cart_data: quote.cart_data,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        client: quote.client,
        quote_items: quote.quote_items
      }
    });

  } catch (error: any) {
    logger.error('Error fetching quote', 'quotes/[id]/GET', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при получении КП' },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/[id] - Обновить КП
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Проверяем существование КП
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.terms !== undefined) updateData.terms = body.terms;
    if (body.cart_data !== undefined) updateData.cart_data = body.cart_data;

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        number: true,
        client_id: true,
        created_by: true,
        status: true,
        valid_until: true,
        subtotal: true,
        tax_amount: true,
        total_amount: true,
        currency: true,
        notes: true,
        terms: true,
        cart_data: true,
        created_at: true,
        updated_at: true
      }
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote
    });

  } catch (error: any) {
    logger.error('Error updating quote', 'quotes/[id]/PUT', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при обновлении КП' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[id] - Удалить КП
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { id } = await params;
    
    // Проверяем существование КП
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Нельзя удалять принятые КП
    if (existingQuote.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Нельзя удалить принятый КП' },
        { status: 400 }
      );
    }

    await prisma.quote.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'КП успешно удален'
    });

  } catch (error: any) {
    logger.error('Error deleting quote', 'quotes/[id]/DELETE', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка при удалении КП' },
      { status: 500 }
    );
  }
}
