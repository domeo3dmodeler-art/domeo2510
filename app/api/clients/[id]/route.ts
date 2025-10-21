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
          order: {
            client_id: id
          }
        },
        select: {
          id: true,
          status: true,
          created_at: true,
          supplier_name: true,
          order: {
            select: {
              total_amount: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      })
    ]);

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}'),
        quotes,
        invoices,
        supplierOrders
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

