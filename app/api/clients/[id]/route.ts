import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Оптимизированный запрос - загружаем только основные данные клиента
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        address: true,
        objectId: true,
        customFields: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Сначала получаем ID заказов клиента для поиска связанных заказов поставщика
    const orders = await prisma.order.findMany({
      where: { client_id: id },
      select: { id: true }
    });
    const orderIds = orders.map(order => order.id);

    // Загружаем документы отдельными оптимизированными запросами
    const [quotes, invoices, supplierOrders] = await Promise.all([
      prisma.quote.findMany({
        where: { client_id: id },
        select: {
          id: true,
          number: true,
          status: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      prisma.invoice.findMany({
        where: { client_id: id },
        select: {
          id: true,
          number: true,
          status: true,
          total_amount: true,
          created_at: true,
          due_date: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      prisma.supplierOrder.findMany({
        where: { 
          // Ищем заказы поставщика через связанные заказы клиента
          parent_document_id: {
            in: orderIds
          }
        },
        select: {
          id: true,
          number: true, // Номер заказа у поставщика
          status: true,
          created_at: true,
          supplier_name: true,
          order_date: true,
          expected_date: true,
          total_amount: true, // Общая сумма заказа у поставщика
          parent_document_id: true,
          cart_session_id: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      })
    ]);

    // Для каждого заказа поставщика ищем связанный счет через логику parent_document_id
    const supplierOrdersWithInvoiceInfo = await Promise.all(
      supplierOrders.map(async (so) => {
        let invoiceInfo = null;
        
        // Ищем счет через цепочку: SupplierOrder → Order → Invoice
        if (so.parent_document_id) {
          const order = await prisma.order.findUnique({
            where: { id: so.parent_document_id },
            select: {
              parent_document_id: true
            }
          });
          
          if (order && order.parent_document_id) {
            const invoice = await prisma.invoice.findUnique({
              where: { id: order.parent_document_id },
              select: {
                id: true,
                number: true,
                total_amount: true
              }
            });
            
            if (invoice) {
              invoiceInfo = {
                id: invoice.id,
                number: invoice.number,
                total_amount: invoice.total_amount
              };
            }
          }
        }
        
        // Fallback: ищем счет по cart_session_id (для совместимости со старыми данными)
        if (!invoiceInfo && so.cart_session_id) {
          const invoice = await prisma.invoice.findFirst({
            where: {
              cart_session_id: so.cart_session_id
            },
            select: {
              id: true,
              number: true,
              total_amount: true
            }
          });
          
          if (invoice) {
            invoiceInfo = {
              id: invoice.id,
              number: invoice.number,
              total_amount: invoice.total_amount
            };
          }
        }
        
        return {
          ...so,
          invoiceInfo
        };
      })
    );

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}'),
        quotes,
        invoices,
        orders,
        supplierOrders: supplierOrdersWithInvoiceInfo
      }
    });

  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { firstName, lastName, middleName, phone, address, objectId, customFields, isActive } = data;

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        middleName,
        phone,
        address,
        objectId,
        customFields: JSON.stringify(customFields || {}),
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}')
      }
    });

  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

