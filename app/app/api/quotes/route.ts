// api/quotes/route.ts
// API роут для CRUD операций с КП (Quote)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/quotes - Получить список КП
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Построение условий фильтрации
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          clientInfo: true,
          notes: true
        }
      }),
      prisma.quote.count({ where })
    ]);

    return NextResponse.json({
      page,
      pageSize,
      total,
      quotes: quotes.map(quote => ({
        ...quote,
        total: Number(quote.total),
        clientInfo: quote.clientInfo ? JSON.parse(JSON.stringify(quote.clientInfo)) : null
      }))
    });

  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка КП' },
      { status: 500 }
    );
  }
}

// POST /api/quotes - Создать новый КП
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Валидация обязательных полей
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'КП должен содержать хотя бы одну позицию' },
        { status: 400 }
      );
    }

    if (!body.total || typeof body.total !== 'number') {
      return NextResponse.json(
        { error: 'Общая сумма КП обязательна' },
        { status: 400 }
      );
    }

    // Создание КП
    const quote = await prisma.quote.create({
      data: {
        title: body.title || `КП от ${new Date().toLocaleDateString()}`,
        status: body.status || 'draft',
        items: body.items,
        total: body.total,
        currency: body.currency || 'RUB',
        clientInfo: body.clientInfo || null,
        notes: body.notes || null
      },
      select: {
        id: true,
        title: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
        clientInfo: true,
        notes: true
      }
    });

    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        total: Number(quote.total),
        clientInfo: quote.clientInfo ? JSON.parse(JSON.stringify(quote.clientInfo)) : null
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании КП' },
      { status: 500 }
    );
  }
}
