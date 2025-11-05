import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/applications/[id]/files - Загрузка оптовых счетов и техзаданий
// ⚠️ DEPRECATED: Используйте POST /api/orders/[id]/files напрямую
// Этот endpoint оставлен для обратной совместимости
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем существование заказа
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
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

    // Создаем директорию для заказов если её нет
    const uploadsDir = join(process.cwd(), 'uploads', 'orders', params.id);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Загрузка оптовых счетов
    for (const file of wholesaleInvoices) {
      if (file.size === 0) continue;

      // Валидация типа файла
      if (!allowedInvoiceTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Неподдерживаемый тип файла для оптового счета: ${file.name}. Разрешены: PDF, Excel` },
          { status: 400 }
        );
      }

      // Валидация размера (максимум 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Файл ${file.name} слишком большой. Максимальный размер: 10MB` },
          { status: 400 }
        );
      }

      // Сохраняем файл
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const extension = file.name.split('.').pop();
      const filename = `wholesale_invoice_${timestamp}_${random}.${extension}`;
      const filepath = join(uploadsDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      const fileUrl = `/uploads/orders/${params.id}/${filename}`;
      uploadedFiles.wholesale_invoices.push(fileUrl);
    }

    // Загрузка техзаданий
    for (const file of technicalSpecs) {
      if (file.size === 0) continue;

      // Валидация типа файла
      if (!allowedTechSpecTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Неподдерживаемый тип файла для техзадания: ${file.name}. Разрешен только PDF` },
          { status: 400 }
        );
      }

      // Валидация размера (максимум 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Файл ${file.name} слишком большой. Максимальный размер: 10MB` },
          { status: 400 }
        );
      }

      // Сохраняем файл
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const extension = file.name.split('.').pop();
      const filename = `tech_spec_${timestamp}_${random}.${extension}`;
      const filepath = join(uploadsDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      const fileUrl = `/uploads/orders/${params.id}/${filename}`;
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
      where: { id: params.id },
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

    return NextResponse.json({
      success: true,
      application: updatedOrder, // Для обратной совместимости
      order: updatedOrder,
      files: {
        wholesale_invoices: allWholesaleInvoices,
        technical_specs: allTechnicalSpecs
      }
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки файлов' },
      { status: 500 }
    );
  }
}

