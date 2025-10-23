import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'ORDERED', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED'];

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
    if (parentUser) {
      try {
        await synchronizeDocumentStatuses(updatedSupplierOrder.parent_document_id, status);
        console.log('✅ API: All document statuses synchronized');

        // Создаем уведомление для комплектатора
        const statusLabels: Record<string, string> = {
          'ORDERED': 'Заказ размещен',
          'READY': 'Получен от поставщика',
          'COMPLETED': 'Исполнен'
        };

        const statusLabel = statusLabels[status] || status;
        
        // Получаем заказ с клиентом для уведомления
        const order = await prisma.order.findUnique({
          where: { id: updatedSupplierOrder.parent_document_id },
          include: { client: true }
        });
        
        if (order && order.client) {
          // Получаем связанный счет для отображения в уведомлении
          let invoiceInfo = '';
          if (order.parent_document_id) {
            const invoice = await prisma.invoice.findUnique({
              where: { id: order.parent_document_id },
              select: { number: true, status: true }
            });
            
            if (invoice) {
              // Маппинг статусов счета для отображения
              const invoiceStatusLabels: Record<string, string> = {
                'DRAFT': 'Черновик',
                'SENT': 'Отправлен',
                'PAID': 'Оплачен',
                'ORDERED': 'Заказ размещен',
                'READY': 'Получен от поставщика',
                'COMPLETED': 'Исполнен',
                'CANCELLED': 'Отменен'
              };
              
              const invoiceStatusLabel = invoiceStatusLabels[invoice.status] || invoice.status;
              invoiceInfo = `Счет ${invoice.number} переведен в статус "${invoiceStatusLabel}"`;
            }
          }
          
          await prisma.notification.create({
            data: {
              user_id: parentUser.id,
              client_id: order.client.id,
              document_id: order.parent_document_id, // Передаем ID счета, а не заказа
              type: 'STATUS_CHANGE',
              title: 'Изменение статуса заказа',
              message: invoiceInfo,
              is_read: false
            }
          });
          
          console.log('✅ API: Notification sent to complettator');
        } else {
          console.log('⚠️ API: Could not find order or client for notification');
        }
      } catch (notificationError) {
        console.error('⚠️ API: Error sending notification:', notificationError);
        // Не прерываем выполнение, если уведомление не отправилось
      }
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
async function synchronizeDocumentStatuses(orderId: string, supplierOrderStatus: string) {
  try {
    console.log(`🔄 Синхронизация статусов для заказа ${orderId} с статусом ${supplierOrderStatus}`);

    // Маппинг статусов заказа поставщику на статусы других документов
    const statusMapping: Record<string, { order: string; invoice: string; quote: string }> = {
      'ORDERED': {
        order: 'CONFIRMED',
        invoice: 'ORDERED', 
        quote: 'ACCEPTED'
      },
      'IN_PRODUCTION': {
        order: 'IN_PRODUCTION',
        invoice: 'IN_PRODUCTION',
        quote: 'ACCEPTED'
      },
      'READY': {
        order: 'READY',
        invoice: 'READY',
        quote: 'ACCEPTED'
      },
      'COMPLETED': {
        order: 'COMPLETED',
        invoice: 'COMPLETED',
        quote: 'ACCEPTED'
      },
      'CANCELLED': {
        order: 'CANCELLED',
        invoice: 'CANCELLED',
        quote: 'REJECTED'
      }
    };

    const mappedStatuses = statusMapping[supplierOrderStatus];
    if (!mappedStatuses) {
      console.log(`⚠️ Нет маппинга для статуса ${supplierOrderStatus}`);
      return;
    }

    // Получаем заказ и его связи
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        parent_document_id: true,
        cart_session_id: true,
        client_id: true
      }
    });

    if (!order) {
      console.log(`❌ Заказ ${orderId} не найден`);
      return;
    }

    // Обновляем статус самого заказа
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: mappedStatuses.order,
        updated_at: new Date()
      }
    });
    console.log(`✅ Статус заказа ${orderId} обновлен на ${mappedStatuses.order}`);

    // Обновляем статус связанного счета (если есть)
    if (order.parent_document_id) {
      // Проверяем, что parent_document_id указывает на счет
      const invoice = await prisma.invoice.findUnique({
        where: { id: order.parent_document_id },
        select: { id: true, number: true, status: true }
      });
      
      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { 
            status: mappedStatuses.invoice,
            updated_at: new Date()
          }
        });
        console.log(`✅ Статус счета ${invoice.number} обновлен на ${mappedStatuses.invoice}`);
      } else {
        console.log(`⚠️ Документ ${order.parent_document_id} не является счетом`);
      }
    }

    // Обновляем статус связанного КП (если есть)
    if (order.parent_document_id) {
      // Проверяем, что parent_document_id указывает на КП
      const quote = await prisma.quote.findUnique({
        where: { id: order.parent_document_id },
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
      } else {
        console.log(`⚠️ Документ ${order.parent_document_id} не является КП`);
      }
    }

    // Дополнительно ищем и обновляем все документы по cart_session_id
    if (order.cart_session_id) {
      // Обновляем все счета с той же сессией корзины
      const invoiceUpdateResult = await prisma.invoice.updateMany({
        where: { 
          cart_session_id: order.cart_session_id,
          id: { not: order.parent_document_id || '' } // Исключаем уже обновленный счет
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
          cart_session_id: order.cart_session_id,
          id: { not: order.parent_document_id || '' } // Исключаем уже обновленный КП
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

    console.log(`🎉 Синхронизация статусов завершена для заказа ${orderId}`);

  } catch (error) {
    console.error('❌ Ошибка синхронизации статусов:', error);
    throw error;
  }
}
