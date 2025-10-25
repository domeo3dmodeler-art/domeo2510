import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isValidInternationalPhone, normalizePhoneForStorage } from '@/lib/utils/phone';

const prisma = new PrismaClient();

// GET /api/clients - получить список клиентов
export async function GET(request: NextRequest) {
  try {
    const clients = await prisma.client.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        address: true,
        objectId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Ошибка при получении клиентов' }, { status: 500 });
  }
}

// POST /api/clients - создать нового клиента
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, middleName, phone, address, objectId } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'Обязательные поля: имя, фамилия, телефон' }, { status: 400 });
    }

    // Валидация телефона
    if (!isValidInternationalPhone(phone)) {
      return NextResponse.json(
        { error: 'Неверный формат телефона. Используйте международный формат (например: +7 999 123-45-67)' },
        { status: 400 }
      );
    }

    // Нормализуем телефон для хранения
    const normalizedPhone = normalizePhoneForStorage(phone);

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || null,
        phone: normalizedPhone,
        address: address || '',
        objectId: objectId || `object-${Date.now()}`
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        address: true,
        objectId: true,
        createdAt: true
      }
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Ошибка при создании клиента' }, { status: 500 });
  }
}