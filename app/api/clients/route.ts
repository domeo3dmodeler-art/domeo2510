import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isValidInternationalPhone, normalizePhoneForStorage } from '@/lib/utils/phone';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const prisma = new PrismaClient();

// GET /api/clients - получить список клиентов
export async function GET(request: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(request);
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
        compilationLeadNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ clients });
  } catch (fetchClientsApiError: any) {
    logger.error('Error fetching clients', 'clients/GET', { error: fetchClientsApiError }, loggingContext);
    
    // Более детальная обработка ошибок
    if (fetchClientsApiError.code === 'P1001') {
      logger.error('Не удается подключиться к базе данных. Проверьте SSH туннель.', 'clients/GET', {}, loggingContext);
      return NextResponse.json(
        { 
          error: 'Ошибка подключения к базе данных. Убедитесь, что SSH туннель запущен.',
          details: 'Запустите SSH туннель: npm run dev:tunnel'
        }, 
        { status: 503 }
      );
    }
    
    // Если ошибка связана с отсутствием поля compilationLeadNumber, возвращаем клиентов без этого поля
    if (fetchClientsApiError && typeof fetchClientsApiError === 'object' && 'code' in fetchClientsApiError && fetchClientsApiError.code === 'P2022') {
      logger.warn('Field compilationLeadNumber does not exist, trying without it...', 'clients/GET', {}, loggingContext);
      try {
        const clientsWithoutField = await prisma.client.findMany({
          where: { isActive: true },
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
          orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ clients: clientsWithoutField });
      } catch (fallbackError) {
        logger.error('Fallback query also failed', 'clients/GET', { error: fallbackError }, loggingContext);
        return NextResponse.json(
          { 
            error: 'Ошибка при получении клиентов',
            details: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }, 
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Ошибка при получении клиентов',
        details: fetchClientsApiError instanceof Error ? fetchClientsApiError.message : String(fetchClientsApiError)
      }, 
      { status: 500 }
    );
  }
}

// POST /api/clients - создать нового клиента
export async function POST(request: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(request);
  try {
    const body = await request.json();
    const { firstName, lastName, middleName, phone, address, objectId, compilationLeadNumber } = body;

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
        objectId: objectId || `object-${Date.now()}`,
        compilationLeadNumber: compilationLeadNumber || null
      },
        select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        address: true,
        objectId: true,
        compilationLeadNumber: true,
        createdAt: true
      }
    });

    return NextResponse.json({ client });
  } catch (createClientApiError) {
    logger.error('Error creating client', 'clients/POST', { error: createClientApiError }, loggingContext);
    return NextResponse.json({ error: 'Ошибка при создании клиента' }, { status: 500 });
  }
}