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

    // Синхронизируем статус счета и отправляем уведомление комплектатору
    if (parentUser) {
      try {
        // Обновляем статус счета синхронно
        const invoiceStatusMap: Record<string, string> = {
          'ORDERED': 'ORDERED',
          'READY': 'READY', 
          'COMPLETED': 'COMPLETED'
        };
        
        const invoiceStatus = invoiceStatusMap[status];
        if (invoiceStatus) {
          await prisma.invoice.updateMany({
            where: { 
              parent_document_id: updatedSupplierOrder.parent_document_id 
            },
            data: { status: invoiceStatus }
          });
          
          console.log('✅ API: Invoice status synchronized:', invoiceStatus);
        }

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
