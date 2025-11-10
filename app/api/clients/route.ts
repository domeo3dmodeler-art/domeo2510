import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidInternationalPhone, normalizePhoneForStorage } from '@/lib/utils/phone';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { apiSuccess, apiError, ApiErrorCode, withErrorHandling } from '@/lib/api/response';
import { ValidationError, BusinessRuleError } from '@/lib/api/errors';
import { createClientSchema, findClientsSchema } from '@/lib/validation/client.schemas';
import { validateRequest } from '@/lib/validation/middleware';
import { clientRepository } from '@/lib/repositories/client.repository';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/request-helpers';

// GET /api/clients - получить список клиентов
async function getHandler(
  request: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(request);
  
  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, unknown> = {};
  
  if (searchParams.get('page')) {
    queryParams.page = parseInt(searchParams.get('page') || '1');
  }
  if (searchParams.get('limit')) {
    queryParams.limit = parseInt(searchParams.get('limit') || '20');
  }
  if (searchParams.get('search')) {
    queryParams.search = searchParams.get('search');
  }
  if (searchParams.get('isActive')) {
    queryParams.isActive = searchParams.get('isActive') === 'true';
  }

  // Валидация query параметров
  const validation = validateRequest(findClientsSchema, queryParams);
  if (!validation.success) {
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      'Ошибка валидации параметров запроса',
      400,
      validation.errors
    );
  }

  try {
    const result = await clientRepository.findMany(validation.data);
    
    return apiSuccess({
      clients: result.clients,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error: unknown) {
    logger.error('Error fetching clients', 'clients/GET', { error }, loggingContext);
    
    // Более детальная обработка ошибок
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P1001') {
      throw new BusinessRuleError('Не удается подключиться к базе данных. Проверьте SSH туннель.');
    }
    
    throw error;
  }
}

export const GET = withErrorHandling(
  requireAuth(getHandler),
  'clients/GET'
);

// POST /api/clients - создать нового клиента
async function postHandler(
  request: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(request);
  const body = await request.json();

  // Валидация через Zod
  const validation = validateRequest(createClientSchema, body);
  if (!validation.success) {
    return apiError(
      ApiErrorCode.VALIDATION_ERROR,
      'Ошибка валидации данных',
      400,
      validation.errors
    );
  }

  const validatedData = validation.data;

  // Валидация телефона
  if (!isValidInternationalPhone(validatedData.phone)) {
    throw new ValidationError('Неверный формат телефона. Используйте международный формат (например: +7 999 123-45-67)');
  }

  // Нормализуем телефон для хранения
  const normalizedPhone = normalizePhoneForStorage(validatedData.phone);

  try {
    const client = await clientRepository.create({
      ...validatedData,
      phone: normalizedPhone
    });

    return apiSuccess(
      {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName,
        phone: client.phone,
        address: client.address,
        compilationLeadNumber: client.compilationLeadNumber,
        createdAt: client.createdAt
      },
      'Клиент успешно создан'
    );
  } catch (error: unknown) {
    logger.error('Error creating client', 'clients/POST', { error }, loggingContext);
    throw error;
  }
}

export const POST = withErrorHandling(
  requireAuth(postHandler),
  'clients/POST'
);