import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const where = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              quotes: true,
              invoices: true,
              orders: true,
              documents: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      clients: clients.map(client => ({
        ...client,
        customFields: JSON.parse(client.customFields || '{}')
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const { firstName, lastName, middleName, phone, address, objectId, customFields } = data;

    if (!firstName || !lastName || !phone || !address || !objectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        middleName,
        phone,
        address,
        objectId,
        customFields: JSON.stringify(customFields || {}),
        isActive: true
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
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

