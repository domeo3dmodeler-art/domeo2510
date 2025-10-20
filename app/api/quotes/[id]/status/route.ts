// api/quotes/[id]/status/route.ts
// API роут для изменения статуса КП

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

// PUT /api/quotes/[id]/status - Изменить статус КП
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;
    
    console.log('🔄 API: Updating quote status:', { id, status, body });

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
      where: { id },
      select: { 
        id: true, 
        status: true
      }
    });

    console.log('🔍 API: Found quote:', existingQuote);

    if (!existingQuote) {
      console.log('❌ API: Quote not found:', id);
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Проверяем возможность изменения статуса (временно отключено для тестирования)
    // if (existingQuote.status === 'ACCEPTED' && status !== 'ACCEPTED') {
    //   return NextResponse.json(
    //     { error: 'Нельзя изменить статус принятого КП' },
    //     { status: 400 }
    //   );
    // }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status
    };

    console.log('💾 API: Updating quote with data:', updateData);

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData
    });

    console.log('✅ API: Quote updated successfully:', updatedQuote);

    return NextResponse.json({
      success: true,
      message: `Статус КП изменен на "${status}"`,
      quote: {
        id: updatedQuote.id,
        status: updatedQuote.status
      }
    });

  } catch (error: any) {
    console.error('❌ API: Error updating quote status:', error);
    console.error('❌ API: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса КП' },
      { status: 500 }
    );
  }
}

// GET /api/quotes/[id]/status - Получить текущий статус КП
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        number: true,
        updated_at: true
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
      number: quote.number,
      status: quote.status,
      updated_at: quote.updated_at,
      canExport: quote.status === 'ACCEPTED'
    });

  } catch (error: any) {
    console.error('Error fetching quote status:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса КП' },
      { status: 500 }
    );
  }
}
