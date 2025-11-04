// api/invoices/[id]/status/route.ts
// API роут для изменения статуса Счета

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyUsersByRole, notifyUser } from '@/lib/notifications';
import { isStatusBlocked } from '@/lib/validation/status-blocking';
import { getStatusLabel } from '@/lib/utils/status-labels';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/auth/roles';
import jwt from 'jsonwebtoken';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];

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
        status: true,
        client_id: true,
        created_by: true,
        number: true
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

    // Получаем роль пользователя из токена
    let userRole: UserRole | null = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = req.cookies.get('auth-token')?.value;
      const authToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : token;
      
      if (authToken) {
        const decoded: any = jwt.verify(authToken, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userRole = decoded.role as UserRole;
        console.log('👤 API: User role from token:', userRole);
      }
    } catch (tokenError) {
      console.warn('⚠️ Не удалось получить роль из токена:', tokenError);
    }

    // Проверяем права на изменение статуса по роли
    // Исключение: если статус уже PAID и пользователь пытается установить PAID повторно,
    // разрешаем это для создания заявки (может быть полезно, если заявка не была создана ранее)
    if (userRole && !(status === 'PAID' && existingInvoice.status === 'PAID')) {
      const canChange = canUserChangeStatus(userRole, 'invoice', existingInvoice.status);
      if (!canChange) {
        console.log('🔒 API: User does not have permission to change status:', { userRole, currentStatus: existingInvoice.status });
        return NextResponse.json(
          { 
            error: 'Недостаточно прав для изменения статуса',
            details: {
              userRole,
              currentStatus: existingInvoice.status,
              reason: 'Статус счета заблокирован для вашей роли'
            }
          },
          { status: 403 }
        );
      }
    }

    // Проверяем блокировку статуса
    const isBlocked = await isStatusBlocked(id, 'invoice');
    if (isBlocked) {
      console.log('🔒 Статус счета заблокирован для ручного изменения');
      return NextResponse.json(
        { 
          error: 'Статус счета заблокирован для ручного изменения. Статус изменяется автоматически через связанные заказы поставщику.',
          blocked: true,
          currentStatus: getStatusLabel(existingInvoice.status, 'invoice')
        },
        { status: 403 }
      );
    }

    // Сохраняем данные ДО обновления для создания заявки
    const oldStatus = existingInvoice.status;
    const wasPaid = oldStatus === 'PAID';
    const invoiceClientId = existingInvoice.client_id;
    const invoiceCreatedBy = existingInvoice.created_by;
    
    // Получаем данные клиента для lead_number
    let clientLeadNumber: string | null = null;
    try {
      const client = await prisma.client.findUnique({
        where: { id: invoiceClientId },
        select: { compilationLeadNumber: true }
      });
      clientLeadNumber = client?.compilationLeadNumber || null;
    } catch (clientError) {
      console.warn('⚠️ Ошибка при получении данных клиента:', clientError);
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status
    };

    console.log('💾 API: Updating invoice with data:', updateData);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            compilationLeadNumber: true
          }
        }
      }
    });

    console.log('✅ API: Invoice updated successfully:', updatedInvoice);

    // При переходе Invoice в статус PAID, связанный Order переходит в статус NEW_PLANNED (для исполнителя)
    if (status === 'PAID' && !wasPaid) {
      try {
        console.log('🔄 Обновление статуса Order при оплате Invoice...');
        
        // Находим заказ, связанный с этим счетом
        const existingOrder = await prisma.order.findFirst({
          where: { invoice_id: id }
        });

        if (existingOrder) {
          // Обновляем статус заказа на NEW_PLANNED (Новый заказ)
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: { status: 'NEW_PLANNED' }
          });
          console.log('✅ Статус заказа обновлен на NEW_PLANNED:', existingOrder.id);
        } else {
          console.log('ℹ️ Заказ для этого счета не найден. Order должен быть создан из корзины первым.');
        }
      } catch (orderError) {
        console.error('❌ Ошибка при обновлении статуса заказа:', orderError);
        // Не прерываем выполнение, если не удалось обновить статус заказа
      }
    }

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

    // oldStatus уже сохранен выше (строка 114)
    // Отправляем уведомления через универсальную функцию
    try {
      console.log('🔔 Отправка уведомления о смене статуса:', {
        documentId: id,
        documentType: 'invoice',
        documentNumber: existingInvoice.number,
        oldStatus,
        newStatus: status,
        clientId: existingInvoice.client_id
      });
      
      const { sendStatusNotification } = await import('@/lib/notifications/status-notifications');
      await sendStatusNotification(
        id,
        'invoice',
        existingInvoice.number,
        oldStatus,
        status,
        existingInvoice.client_id || ''
      );
      
      console.log('✅ Уведомление отправлено успешно');
    } catch (notificationError) {
      console.error('❌ Не удалось отправить уведомление:', notificationError);
      console.error('❌ Детали ошибки:', {
        message: notificationError instanceof Error ? notificationError.message : String(notificationError),
        stack: notificationError instanceof Error ? notificationError.stack : undefined
      });
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
