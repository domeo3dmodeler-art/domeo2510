import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/applications/[id]/project - Загрузка проекта/планировки
// ⚠️ DEPRECATED: Используйте POST /api/orders/[id]/project напрямую
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
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Разрешены: PDF, JPG, PNG, DWG, DXF' },
        { status: 400 }
      );
    }

    // Валидация размера файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 10MB' },
        { status: 400 }
      );
    }

    // Создаем директорию для заказов если её нет
    const uploadsDir = join(process.cwd(), 'uploads', 'orders', params.id);
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
    const fileUrl = `/uploads/orders/${params.id}/${filename}`;

    // Обновляем заказ
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
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

    return NextResponse.json({
      success: true,
      application: updatedOrder, // Для обратной совместимости
      order: updatedOrder,
      file_url: fileUrl
    });

  } catch (error) {
    console.error('Error uploading project file:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки файла проекта' },
      { status: 500 }
    );
  }
}

