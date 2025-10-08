import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/clients - Получить всех клиентов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      isActive: true
    };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          phone: true,
          address: true,
          objectId: true,
          customFields: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              quotes: true,
              invoices: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.client.count({ where })
    ]);

    // Парсим customFields для каждого клиента
    const processedClients = clients.map(client => ({
      id: client.id,
      name: `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim(),
      firstName: client.firstName,
      lastName: client.lastName,
      middleName: client.middleName,
      phone: client.phone,
      address: client.address,
      objectId: client.objectId,
      customFields: client.customFields ? JSON.parse(client.customFields) : {},
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      ordersCount: client._count.orders,
      quotesCount: client._count.quotes,
      invoicesCount: client._count.invoices
    }));

    return NextResponse.json({
      success: true,
      clients: processedClients,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении клиентов' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Создать нового клиента
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      middleName, 
      phone, 
      address, 
      objectId, 
      customFields 
    } = body;

    if (!firstName || !lastName || !phone || !address || !objectId) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
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
        customFields: customFields ? JSON.stringify(customFields) : '{}'
      }
    });

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim(),
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName,
        phone: client.phone,
        address: client.address,
        objectId: client.objectId,
        customFields: client.customFields ? JSON.parse(client.customFields) : {},
        createdAt: client.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании клиента' },
      { status: 500 }
    );
  }
}