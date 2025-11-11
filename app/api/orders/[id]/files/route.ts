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

// POST /api/orders/[id]/files - Загрузка оптовых счетов и техзаданий
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
  const wholesaleInvoices = formData.getAll('wholesale_invoices') as File[];
  const technicalSpecs = formData.getAll('technical_specs') as File[];

  // Валидация типов файлов
  const allowedInvoiceTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-excel', // XLS
    'application/excel'
  ];

  const allowedTechSpecTypes = ['application/pdf'];

  const uploadedFiles: {
    wholesale_invoices: string[];
    technical_specs: string[];
  } = {
    wholesale_invoices: [],
    technical_specs: []
  };

  // Создаем директорию для заказов если её нет (в public/uploads для доступа через API)
  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'orders', id);
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Загрузка оптовых счетов
  for (const file of wholesaleInvoices) {
    if (file.size === 0) continue;

    if (!allowedInvoiceTypes.includes(file.type)) {
      throw new ValidationError(`Неподдерживаемый тип файла для оптового счета: ${file.name}. Разрешены: PDF, Excel`);
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new ValidationError(`Файл ${file.name} слишком большой. Максимальный размер: 10MB`);
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    // Безопасное имя файла: убираем недопустимые символы, но сохраняем читаемость
    const safeOriginalName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100); // Ограничиваем длину
    const filename = `wholesale_invoice_${timestamp}_${safeOriginalName}`;
    const filepath = join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Сохраняем оригинальное имя в query параметре для отображения
    const fileUrl = `/api/uploads/orders/${id}/${filename}?original=${encodeURIComponent(file.name)}`;
    uploadedFiles.wholesale_invoices.push(fileUrl);
  }

  // Загрузка техзаданий
  for (const file of technicalSpecs) {
    if (file.size === 0) continue;

    if (!allowedTechSpecTypes.includes(file.type)) {
      throw new ValidationError(`Неподдерживаемый тип файла для техзадания: ${file.name}. Разрешен только PDF`);
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new ValidationError(`Файл ${file.name} слишком большой. Максимальный размер: 10MB`);
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    // Безопасное имя файла: убираем недопустимые символы, но сохраняем читаемость
    const safeOriginalName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100); // Ограничиваем длину
    const filename = `tech_spec_${timestamp}_${safeOriginalName}`;
    const filepath = join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Сохраняем оригинальное имя в query параметре для отображения
    const fileUrl = `/api/uploads/orders/${id}/${filename}?original=${encodeURIComponent(file.name)}`;
    uploadedFiles.technical_specs.push(fileUrl);
  }

  // Получаем существующие файлы
  const existingWholesaleInvoices = order.wholesale_invoices 
    ? JSON.parse(order.wholesale_invoices) 
    : [];
  const existingTechnicalSpecs = order.technical_specs 
    ? JSON.parse(order.technical_specs) 
    : [];

  // Объединяем с новыми файлами
  const allWholesaleInvoices = [...existingWholesaleInvoices, ...uploadedFiles.wholesale_invoices];
  const allTechnicalSpecs = [...existingTechnicalSpecs, ...uploadedFiles.technical_specs];

  // Обновляем заказ
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      wholesale_invoices: JSON.stringify(allWholesaleInvoices),
      technical_specs: JSON.stringify(allTechnicalSpecs)
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
    files: {
      wholesale_invoices: allWholesaleInvoices,
      technical_specs: allTechnicalSpecs
    }
  }, 'Файлы загружены');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withErrorHandling(
    requireAuth((request, user) => postHandler(request, user, { params })),
    'orders/[id]/files/POST'
  )(req);
}

