import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/quotes - Получить все КП (упрощенная версия)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        select: {
          id: true,
          number: true,
          client_id: true,
          status: true,
          total_amount: true,
          currency: true,
          valid_until: true,
          notes: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phone: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.quote.count({ where })
    ]);

    // Форматируем данные КП (без items пока)
    const processedQuotes = quotes.map(quote => ({
      id: quote.id,
      number: quote.number,
      clientId: quote.client_id,
      clientName: `${quote.client.lastName} ${quote.client.firstName} ${quote.client.middleName || ''}`.trim(),
      status: quote.status,
      total: quote.total_amount,
      currency: quote.currency,
      discount: 0, // Поле discount_percent отсутствует в схеме
      validUntil: quote.valid_until,
      notes: quote.notes,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
      acceptedAt: null, // Поле accepted_at отсутствует в схеме
      items: [] // Пока пустой массив
    }));

    return NextResponse.json({
      success: true,
      quotes: processedQuotes,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении КП' },
      { status: 500 }
    );
  }
}

// POST /api/quotes - Создать новое КП (упрощенная версия)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      client_id, 
      status, 
      total_amount, 
      currency, 
      valid_until, 
      notes 
    } = body;

    if (!client_id || !status || !total_amount) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Генерируем номер КП
    const quoteCount = await prisma.quote.count();
    const quoteNumber = `KP-${String(quoteCount + 1).padStart(3, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        number: quoteNumber,
        client_id,
        created_by: 'system', // Обязательное поле
        status: status || 'DRAFT',
        total_amount: parseFloat(total_amount),
        currency: currency || 'RUB',
        valid_until: valid_until ? new Date(valid_until) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней по умолчанию
        notes
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        number: quote.number,
        clientId: quote.client_id,
        clientName: `${quote.client.lastName} ${quote.client.firstName} ${quote.client.middleName || ''}`.trim(),
        status: quote.status,
        total: quote.total_amount,
        currency: quote.currency,
        discount: 0, // Поле discount_percent отсутствует в схеме
        validUntil: quote.valid_until,
        notes: quote.notes,
        createdAt: quote.created_at,
        items: [] // Пока пустой массив
      }
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании КП' },
      { status: 500 }
    );
  }
}