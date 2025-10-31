import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED', 'CANCELLED'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;
    
    console.log('🔄 API: Updating supplier order status:', { id, status, body });

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: 'Недопустимый статус', 
        details: { 
          validStatuses: VALID_STATUSES, 
          providedStatus: status 
        } 
      }, { status: 400 });
    }

    const existingSupplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
    
    console.log('🔍 API: Found supplier order:', existingSupplierOrder);

    if (!existingSupplierOrder) {
      console.log('❌ API: Supplier order not found:', id);
      return NextResponse.json({ error: 'Заказ у поставщика не найден' }, { status: 404 });
    }

    const updateData: any = { status };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    console.log('💾 API: Updating supplier order with data:', updateData);

    const updatedSupplierOrder = await prisma.supplierOrder.update({
      where: { id },
      data: updateData
    });
    
    console.log('✅ API: Supplier order updated successfully:', updatedSupplierOrder);

    // Сохраняем старый статус для уведомлений
    const oldStatus = existingSupplierOrder.status;

    // Получаем связанные данные для уведомлений
    let parentUser = null;
    if (updatedSupplierOrder.parent_document_id) {
      // Ищем заказ напрямую по parent_document_id
      const order = await prisma.order.findUnique({
        where: { id: updatedSupplierOrder.parent_document_id },
        include: { client: true }
      });
      
      if (order) {
        // Получаем пользователя по created_by
        parentUser = await prisma.user.findUnique({
          where: { id: order.created_by }
        });
        
        // Если пользователь не найден (например, "system"), ищем комплектатора
        if (!parentUser) {
          parentUser = await prisma.user.findFirst({
            where: { role: 'COMPLECTATOR' }
          });
        }
      } else {
        // Если заказа нет, ищем счет
        const invoice = await prisma.invoice.findFirst({
          where: { parent_document_id: updatedSupplierOrder.parent_document_id }
        });
        
        if (invoice) {
          // Получаем пользователя по created_by
          parentUser = await prisma.user.findUnique({
            where: { id: invoice.created_by }
          });
        }
      }
    }

    // Синхронизируем статус со всеми связанными документами
    // SupplierOrder теперь связан напрямую с Invoice через parent_document_id
    if (updatedSupplierOrder.parent_document_id) {
      try {
        await synchronizeDocumentStatuses(updatedSupplierOrder.parent_document_id, status);
        console.log('✅ API: All document statuses synchronized');
      } catch (syncError) {
        console.error('❌ API: Error synchronizing document statuses:', syncError);
        // Не прерываем выполнение, если синхронизация не удалась
      }
    }

    // Отправляем уведомления через универсальную функцию
    try {
      // Получаем данные заказа у поставщика для уведомлений
      const supplierOrderForNotification = await prisma.supplierOrder.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          status: true,
          parent_document_id: true
        }
      });

      if (supplierOrderForNotification && supplierOrderForNotification.parent_document_id) {
        // Получаем связанный Invoice для client_id
        const invoice = await prisma.invoice.findUnique({
          where: { id: supplierOrderForNotification.parent_document_id },
          select: {
            id: true,
            number: true,
            client_id: true
          }
        });

        console.log('🔔 Отправка уведомления о смене статуса SupplierOrder:', {
          documentId: id,
          documentType: 'supplier_order',
          documentNumber: supplierOrderForNotification.number,
          oldStatus,
          newStatus: status,
          clientId: invoice?.client_id
        });
        
        const { sendStatusNotification } = await import('@/lib/notifications/status-notifications');
        await sendStatusNotification(
          id,
          'supplier_order',
          supplierOrderForNotification.number || supplierOrderForNotification.id,
          oldStatus,
          status,
          invoice?.client_id || ''
        );
        
        console.log('✅ Уведомление SupplierOrder отправлено успешно');
      } else {
        console.log('⚠️ API: Could not find supplier order or parent document for notification');
      }
    } catch (notificationError) {
      console.error('❌ Не удалось отправить уведомление SupplierOrder:', notificationError);
      console.error('❌ Детали ошибки:', {
        message: notificationError instanceof Error ? notificationError.message : String(notificationError),
        stack: notificationError instanceof Error ? notificationError.stack : undefined
      });
      // Не прерываем выполнение, если не удалось отправить уведомление
    }

    return NextResponse.json({
      success: true,
      message: `Статус заказа у поставщика изменен на "${status}"`,
      supplierOrder: {
        id: updatedSupplierOrder.id,
        status: updatedSupplierOrder.status
      }
    });
  } catch (error: any) {
    console.error('❌ API: Error updating supplier order status:', error);
    console.error('❌ API: Error details:', { 
      message: error.message, 
      stack: error.stack, 
      name: error.name 
    });
    return NextResponse.json({ 
      error: 'Ошибка при изменении статуса заказа у поставщика' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        supplier_name: true, 
        updated_at: true 
      }
    });
    
    if (!supplierOrder) {
      return NextResponse.json({ error: 'Заказ у поставщика не найден' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: supplierOrder.id,
      supplier_name: supplierOrder.supplier_name,
      status: supplierOrder.status,
      updated_at: supplierOrder.updated_at
    });
  } catch (error: any) {
    console.error('❌ API: Error fetching supplier order status:', error);
    return NextResponse.json({ 
      error: 'Ошибка при получении статуса заказа у поставщика' 
    }, { status: 500 });
  }
}

// Функция синхронизации статусов всех связанных документов
async function synchronizeDocumentStatuses(invoiceId: string, supplierOrderStatus: string) {
  try {
    console.log(`🔄 Синхронизация статусов для счета ${invoiceId} с статусом ${supplierOrderStatus}`);

    // Маппинг статусов заказа поставщику на статусы других документов
    const statusMapping: Record<string, { invoice: string; quote: string }> = {
      'ORDERED': {
        invoice: 'ORDERED', 
        quote: 'ACCEPTED'
      },
      'RECEIVED_FROM_SUPPLIER': {
        invoice: 'RECEIVED_FROM_SUPPLIER',
        quote: 'ACCEPTED'
      },
      'COMPLETED': {
        invoice: 'COMPLETED',
        quote: 'ACCEPTED'
      },
      'CANCELLED': {
        invoice: 'CANCELLED',
        quote: 'REJECTED'
      }
    };

    const mappedStatuses = statusMapping[supplierOrderStatus];
    if (!mappedStatuses) {
      console.log(`⚠️ Нет маппинга для статуса ${supplierOrderStatus}`);
      return;
    }

    // Получаем счет и его связи
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        parent_document_id: true,
        cart_session_id: true,
        client_id: true
      }
    });

    if (!invoice) {
      console.log(`❌ Счет ${invoiceId} не найден`);
      return;
    }

    // Обновляем статус счета
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: mappedStatuses.invoice,
        updated_at: new Date()
      }
    });
    console.log(`✅ Статус счета ${invoiceId} обновлен на ${mappedStatuses.invoice}`);

    // Обновляем статус связанного КП (если есть)
    if (invoice.parent_document_id) {
      const quote = await prisma.quote.findUnique({
        where: { id: invoice.parent_document_id },
        select: { id: true, number: true, status: true }
      });
      
      if (quote) {
        await prisma.quote.update({
          where: { id: quote.id },
          data: { 
            status: mappedStatuses.quote,
            updated_at: new Date()
          }
        });
        console.log(`✅ Статус КП ${quote.number} обновлен на ${mappedStatuses.quote}`);
      }
    }

    // Дополнительно ищем и обновляем все документы по cart_session_id
    if (invoice.cart_session_id) {
      // Обновляем все счета с той же сессией корзины
      const invoiceUpdateResult = await prisma.invoice.updateMany({
        where: { 
          cart_session_id: invoice.cart_session_id,
          id: { not: invoiceId }
        },
        data: { 
          status: mappedStatuses.invoice,
          updated_at: new Date()
        }
      });
      
      if (invoiceUpdateResult.count > 0) {
        console.log(`✅ Обновлено ${invoiceUpdateResult.count} дополнительных счетов по cart_session_id`);
      }

      // Обновляем все КП с той же сессией корзины
      const quoteUpdateResult = await prisma.quote.updateMany({
        where: { 
          cart_session_id: invoice.cart_session_id,
          id: { not: invoice.parent_document_id || '' }
        },
        data: { 
          status: mappedStatuses.quote,
          updated_at: new Date()
        }
      });
      
      if (quoteUpdateResult.count > 0) {
        console.log(`✅ Обновлено ${quoteUpdateResult.count} дополнительных КП по cart_session_id`);
      }
    }

    console.log(`🎉 Синхронизация статусов завершена для счета ${invoiceId}`);

  } catch (error) {
    console.error('❌ Ошибка синхронизации статусов:', error);
    throw error;
  }
}
