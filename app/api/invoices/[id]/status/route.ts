// api/invoices/[id]/status/route.ts
// API роут для изменения статуса Счета

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyUsersByRole, notifyUser } from '@/lib/notifications';
import jwt from 'jsonwebtoken';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'IN_PRODUCTION', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];

// PUT /api/invoices/[id]/status - Изменить статус Счета
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;
    
    console.log('🔄 API: Updating invoice status:', { id, status, body });

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

    // Проверяем существование Счета
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true
      }
    });

    console.log('🔍 API: Found invoice:', existingInvoice);

    if (!existingInvoice) {
      console.log('❌ API: Invoice not found:', id);
      return NextResponse.json(
        { error: 'Счет не найден' },
        { status: 404 }
      );
    }

    // Проверяем возможность изменения статуса (временно отключено для тестирования)
    // if (existingInvoice.status === 'COMPLETED' && status !== 'COMPLETED') {
    //   return NextResponse.json(
    //     { error: 'Нельзя изменить статус исполненного счета' },
    //     { status: 400 }
    //   );
    // }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status
    };

    console.log('💾 API: Updating invoice with data:', updateData);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData
    });

    console.log('✅ API: Invoice updated successfully:', updatedInvoice);

    // Получаем user_id из токена для истории
    let userId = 'system';
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userId = decoded.userId;
      }
    } catch (tokenError) {
      console.warn('⚠️ Не удалось получить user_id из токена:', tokenError);
    }

    // Отправляем уведомления в зависимости от статуса
    try {
      if (status === 'PAID') {
        // Уведомляем всех исполнителей о том, что счет оплачен
        await notifyUsersByRole('executor', {
          clientId: existingInvoice.client_id,
          documentId: id,
          type: 'invoice_paid',
          title: 'Счет оплачен',
          message: `Счет ${existingInvoice.number} переведен в статус "Оплачен/Заказ". Теперь только Исполнитель может изменять статус.`
        });
      } else if (['IN_PRODUCTION', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'].includes(status)) {
        // Уведомляем комплектатора о изменении статуса исполнителем
        const statusNames: Record<string, string> = {
          'IN_PRODUCTION': 'Заказ размещен',
          'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
          'COMPLETED': 'Исполнен'
        };
        
        await notifyUsersByRole('complectator', {
          clientId: existingInvoice.client_id,
          documentId: id,
          type: 'status_changed',
          title: 'Статус изменен',
          message: `Исполнитель изменил статус счета ${existingInvoice.number} на "${statusNames[status]}".`
        });
      }
    } catch (notificationError) {
      console.warn('⚠️ Не удалось отправить уведомление:', notificationError);
      // Не прерываем выполнение, если не удалось отправить уведомление
    }

    return NextResponse.json({
      success: true,
      message: `Статус счета изменен на "${status}"`,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status
      }
    });

  } catch (error: any) {
    console.error('❌ API: Error updating invoice status:', error);
    console.error('❌ API: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса счета' },
      { status: 500 }
    );
  }
}

// GET /api/invoices/[id]/status - Получить текущий статус Счета
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        number: true,
        updated_at: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Счет не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      updated_at: invoice.updated_at,
      canExport: invoice.status === 'PAID'
    });

  } catch (error: any) {
    console.error('Error fetching invoice status:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса счета' },
      { status: 500 }
    );
  }
}
