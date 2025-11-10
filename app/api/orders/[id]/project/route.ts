import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { apiSuccess, apiError, ApiErrorCode, withErrorHandling } from '@/lib/api/response';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/request-helpers';

// POST /api/orders/[id]/project - Загрузка проекта/планировки
async function postHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);
  const { id } = await params;

  // Проверяем существование заказа
  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    throw new NotFoundError('Заказ', id);
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw new ValidationError('Файл не предоставлен');
  }

  // Валидация типа файла
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/acad',
    'application/x-dwg',
    'application/x-dxf',
    'image/vnd.dwg',
    'image/x-dwg'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Неподдерживаемый тип файла. Разрешены: PDF, JPG, PNG, DWG, DXF');
  }

  // Валидация размера файла (максимум 1MB)
  const maxSize = 1 * 1024 * 1024; // 1MB
  if (file.size > maxSize) {
    throw new ValidationError('Файл слишком большой. Максимальный размер: 1MB');
  }

  // Создаем директорию для заказов если её нет
  const uploadsDir = join(process.cwd(), 'uploads', 'orders', id);
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Генерируем имя файла
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `project_${timestamp}.${extension}`;
  const filepath = join(uploadsDir, filename);

  // Сохраняем файл
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // URL файла для сохранения в БД
  const fileUrl = `/uploads/orders/${id}/${filename}`;

  // Обновляем заказ
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      project_file_url: fileUrl
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true
        }
      }
    }
  });

  return apiSuccess({
    order: updatedOrder,
    file_url: fileUrl
  }, 'Файл проекта загружен');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withErrorHandling(
    requireAuth((request, user) => postHandler(request, user, { params })),
    'orders/[id]/project/POST'
  )(req);
}

