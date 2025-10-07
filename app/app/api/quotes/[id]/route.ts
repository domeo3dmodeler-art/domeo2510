// api/quotes/[id]/route.ts
// API роут для операций с отдельным КП

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/quotes/[id] - Получить КП по ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        status: true,
        items: true,
        total: true,
        currency: true,
        clientInfo: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...quote,
      total: Number(quote.total),
      items: JSON.parse(JSON.stringify(quote.items)),
      clientInfo: quote.clientInfo ? JSON.parse(JSON.stringify(quote.clientInfo)) : null
    });

  } catch (error: any) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении КП' },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/[id] - Обновить КП
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    
    // Проверяем существование КП
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
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
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.clientInfo !== undefined) updateData.clientInfo = body.clientInfo;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Если статус меняется на "accepted", устанавливаем acceptedAt
    if (body.status === 'accepted' && existingQuote.status !== 'accepted') {
      updateData.acceptedAt = new Date();
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
        items: true,
        total: true,
        currency: true,
        clientInfo: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      quote: {
        ...updatedQuote,
        total: Number(updatedQuote.total),
        items: JSON.parse(JSON.stringify(updatedQuote.items)),
        clientInfo: updatedQuote.clientInfo ? JSON.parse(JSON.stringify(updatedQuote.clientInfo)) : null
      }
    });

  } catch (error: any) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении КП' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[id] - Удалить КП
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Проверяем существование КП
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { id: true, status: true }
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Нельзя удалять принятые КП
    if (existingQuote.status === 'accepted') {
      return NextResponse.json(
        { error: 'Нельзя удалить принятый КП' },
        { status: 400 }
      );
    }

    await prisma.quote.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'КП успешно удален'
    });

  } catch (error: any) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении КП' },
      { status: 500 }
    );
  }
}
