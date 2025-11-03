import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/applications/[id]/files - Загрузка оптовых счетов и техзаданий
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем существование заявки
    const application = await prisma.application.findUnique({
      where: { id: params.id }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
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

    // Создаем директорию для заявок если её нет
    const uploadsDir = join(process.cwd(), 'uploads', 'applications', params.id);
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

      const fileUrl = `/uploads/applications/${params.id}/${filename}`;
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

      const fileUrl = `/uploads/applications/${params.id}/${filename}`;
      uploadedFiles.technical_specs.push(fileUrl);
    }

    // Получаем существующие файлы
    const existingWholesaleInvoices = application.wholesale_invoices 
      ? JSON.parse(application.wholesale_invoices) 
      : [];
    const existingTechnicalSpecs = application.technical_specs 
      ? JSON.parse(application.technical_specs) 
      : [];

    // Объединяем с новыми файлами
    const allWholesaleInvoices = [...existingWholesaleInvoices, ...uploadedFiles.wholesale_invoices];
    const allTechnicalSpecs = [...existingTechnicalSpecs, ...uploadedFiles.technical_specs];

    // Обновляем заявку
    const updatedApplication = await prisma.application.update({
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
      application: updatedApplication,
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

