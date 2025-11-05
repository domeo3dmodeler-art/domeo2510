import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const prisma = new PrismaClient();

// GET /api/invoices - Получить все счета (упрощенная версия)
export async function GET(request: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        select: {
          id: true,
          number: true,
          client_id: true,
          status: true,
          subtotal: true,
          tax_amount: true,
          total_amount: true,
          currency: true,
          invoice_date: true,
          due_date: true,
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
      prisma.invoice.count({ where })
    ]);

    // Форматируем данные счетов (без items пока)
    const processedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      clientId: invoice.client_id,
      clientName: `${invoice.client.lastName} ${invoice.client.firstName} ${invoice.client.middleName || ''}`.trim(),
      status: invoice.status,
      subtotal: invoice.subtotal,
      taxAmount: invoice.tax_amount,
      total: invoice.total_amount,
      currency: invoice.currency,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      items: [] // Пока пустой массив
    }));

    return NextResponse.json({
      success: true,
      invoices: processedInvoices,
      total,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching invoices', 'invoices/GET', { error }, loggingContext);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении счетов' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Создать новый счет (упрощенная версия)
// ⚠️ DEPRECATED: Используйте POST /api/documents/create с parent_document_id = orderId
// Этот endpoint создает Invoice напрямую без Order, что не соответствует текущей логике Order-first
// Для правильной работы создайте Order через POST /api/orders, затем Invoice через POST /api/documents/create
export async function POST(request: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(request);
  try {
    const body = await request.json();
    const { 
      client_id, 
      status, 
      subtotal, 
      tax_amount, 
      total_amount, 
      currency, 
      invoice_date, 
      due_date, 
      notes 
    } = body;

    if (!client_id || !status || !total_amount) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Генерируем номер счета
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(3, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        client_id,
        created_by: 'system', // Обязательное поле
        status: status || 'DRAFT',
        subtotal: parseFloat(subtotal) || 0,
        tax_amount: parseFloat(tax_amount) || 0,
        total_amount: parseFloat(total_amount),
        currency: currency || 'RUB',
        invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
        due_date: due_date ? new Date(due_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней по умолчанию
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
      invoice: {
        id: invoice.id,
        number: invoice.number,
        clientId: invoice.client_id,
        clientName: `${invoice.client.lastName} ${invoice.client.firstName} ${invoice.client.middleName || ''}`.trim(),
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxAmount: invoice.tax_amount,
        total: invoice.total_amount,
        currency: invoice.currency,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        notes: invoice.notes,
        createdAt: invoice.created_at,
        items: [] // Пока пустой массив
      }
    });
  } catch (error) {
    logger.error('Error creating invoice', 'invoices/POST', { error }, loggingContext);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании счета' },
      { status: 500 }
    );
  }
}