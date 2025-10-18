// api/quotes/[id]/status/route.ts
// API роут для изменения статуса КП

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

// PUT /api/quotes/[id]/status - Изменить статус КП
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, notes } = body;

    // Валидация статуса
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Недопустимый статус',
          details: {
            validStatuses: VALID_STATUSES,
            providedStatus: status
          }
        },
        { status: 400 }
      );
    }

    // Проверяем существование КП
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        status: true, 
        title: true,
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

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Проверяем возможность изменения статуса
    if (existingQuote.status === 'accepted' && status !== 'accepted') {
      return NextResponse.json(
        { error: 'Нельзя изменить статус принятого КП' },
        { status: 400 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Если статус меняется на "accepted", устанавливаем acceptedAt
    if (status === 'accepted' && existingQuote.status !== 'accepted') {
      updateData.acceptedAt = new Date();
    }

    // Если статус меняется с "accepted", сбрасываем acceptedAt
    if (status !== 'accepted' && existingQuote.status === 'accepted') {
      updateData.acceptedAt = null;
    }

    // Обновляем примечания, если они переданы
    if (notes !== undefined) {
      updateData.notes = notes;
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
      message: `Статус КП изменен на "${status}"`,
      quote: {
        ...updatedQuote,
        total: Number(updatedQuote.total),
        items: JSON.parse(JSON.stringify(updatedQuote.items)),
        clientInfo: updatedQuote.clientInfo ? JSON.parse(JSON.stringify(updatedQuote.clientInfo)) : null
      }
    });

  } catch (error: any) {
    console.error('Error updating quote status:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса КП' },
      { status: 500 }
    );
  }
}

// GET /api/quotes/[id]/status - Получить текущий статус КП
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        status: true, 
        title: true,
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
      id: quote.id,
      title: quote.title,
      status: quote.status,
      updatedAt: quote.updatedAt,
      acceptedAt: quote.acceptedAt,
      canExport: quote.status === 'accepted'
    });

  } catch (error: any) {
    console.error('Error fetching quote status:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса КП' },
      { status: 500 }
    );
  }
}
