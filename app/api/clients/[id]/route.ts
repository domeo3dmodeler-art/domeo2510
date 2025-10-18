import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        quotes: {
          orderBy: { created_at: 'desc' },
          take: 5
        },
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 5
        },
        orders: {
          orderBy: { created_at: 'desc' },
          take: 5
        },
        documents: {
          orderBy: { created_at: 'desc' },
          take: 10
        },
        _count: {
          select: {
            quotes: true,
            invoices: true,
            orders: true,
            documents: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}')
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
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { firstName, lastName, middleName, phone, address, objectId, customFields, isActive } = data;

    const client = await prisma.client.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    await prisma.client.delete({
      where: { id: params.id }
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

