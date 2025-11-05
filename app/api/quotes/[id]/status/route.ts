// api/quotes/[id]/status/route.ts
// API роут для изменения статуса КП

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isStatusBlocked } from '@/lib/validation/status-blocking';
import { getStatusLabel } from '@/lib/utils/status-labels';
import { notifyUsersByRole } from '@/lib/notifications';
import { canUserChangeStatus } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/auth/roles';
import jwt from 'jsonwebtoken';

const VALID_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

// PUT /api/quotes/[id]/status - Изменить статус КП
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    // Получаем user_id из токена
    let userId = 'system'; // fallback
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars");
        userId = decoded.userId;
      }
    } catch (tokenError) {
      console.warn('⚠️ Не удалось получить user_id из токена:', tokenError);
    }
    
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
    if (userRole) {
      const canChange = canUserChangeStatus(userRole, 'quote', existingQuote.status);
      if (!canChange) {
        console.log('🔒 API: User does not have permission to change status:', { userRole, currentStatus: existingQuote.status });
        return NextResponse.json(
          { 
            error: 'Недостаточно прав для изменения статуса',
            details: {
              userRole,
              currentStatus: existingQuote.status,
              reason: 'Статус КП заблокирован для вашей роли'
            }
          },
          { status: 403 }
        );
      }
    }

    // Проверяем блокировку статуса
    const isBlocked = await isStatusBlocked(id, 'quote');
    if (isBlocked) {
      console.log('🔒 Статус КП заблокирован для ручного изменения');
      return NextResponse.json(
        { 
          error: 'Статус КП заблокирован для ручного изменения. Статус изменяется автоматически через связанные заказы поставщику.',
          blocked: true,
          currentStatus: getStatusLabel(existingQuote.status, 'quote')
        },
        { status: 403 }
      );
    }

    // Получаем старый статус для истории
    const oldQuote = await prisma.quote.findUnique({
      where: { id },
      select: { status: true }
    });

    // Подготавливаем данные для обновления
    const updateData: any = {
      status
    };

    console.log('💾 API: Updating quote with data:', updateData);

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData
    });

    // Добавляем запись в историю изменений
    if (oldQuote && oldQuote.status !== status) {
      try {
        await prisma.documentHistory.create({
          data: {
            document_id: id,
            user_id: userId,
            action: 'status_change',
            old_value: oldQuote.status,
            new_value: status,
            details: JSON.stringify({ 
              document_type: 'quote',
              notes: notes || null 
            }),
            created_at: new Date()
          }
        });
      } catch (historyError) {
        console.warn('⚠️ Не удалось создать запись в истории:', historyError);
        // Не прерываем выполнение, если не удалось записать историю
      }
    }

    console.log('✅ API: Quote updated successfully:', updatedQuote);

    // Сохраняем старый статус для уведомлений
    const oldStatus = oldQuote.status;

    // Отправляем уведомления через универсальную функцию
    try {
      const quoteForNotification = await prisma.quote.findUnique({
        where: { id },
        select: { client_id: true, number: true, status: true }
      });
      
      console.log('🔔 Отправка уведомления о смене статуса Quote:', {
        documentId: id,
        documentType: 'quote',
        documentNumber: quoteForNotification?.number,
        oldStatus,
        newStatus: status,
        clientId: quoteForNotification?.client_id
      });
      
      if (quoteForNotification) {
        const { sendStatusNotification } = await import('@/lib/notifications/status-notifications');
        await sendStatusNotification(
          id,
          'quote',
          quoteForNotification.number,
          oldStatus,
          status,
          quoteForNotification.client_id || ''
        );
        console.log('✅ Уведомление Quote отправлено успешно');
      }
    } catch (notificationError) {
      console.error('❌ Не удалось отправить уведомление Quote:', notificationError);
      console.error('❌ Детали ошибки:', {
        message: notificationError instanceof Error ? notificationError.message : String(notificationError),
        stack: notificationError instanceof Error ? notificationError.stack : undefined
      });
    }

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
