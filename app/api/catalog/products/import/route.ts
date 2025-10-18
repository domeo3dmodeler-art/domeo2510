import { NextRequest, NextResponse } from 'next/server';
import { productImportService } from '@/lib/services/product-import.service';

// POST /api/catalog/products/import - Импорт товаров из Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const catalogCategoryId = formData.get('catalogCategoryId') as string;
    const templateId = formData.get('templateId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    if (!catalogCategoryId) {
      return NextResponse.json(
        { error: 'ID категории каталога не указан' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Поддерживаются только файлы Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // Читаем файл
    const buffer = Buffer.from(await file.arrayBuffer());

    // Импортируем товары
    const result = await productImportService.importFromExcel(
      buffer,
      file.name,
      catalogCategoryId,
      templateId || undefined
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error importing products:', error);
    return NextResponse.json(
      { error: 'Ошибка при импорте товаров' },
      { status: 500 }
    );
  }
}

// GET /api/catalog/products/import/template - Получить шаблон Excel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');

    if (!catalogCategoryId) {
      return NextResponse.json(
        { error: 'ID категории каталога не указан' },
        { status: 400 }
      );
    }

    // Генерируем шаблон
    const templateBuffer = await productImportService.getExcelTemplate(catalogCategoryId);

    return new NextResponse(templateBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="product-template-${catalogCategoryId}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации шаблона' },
      { status: 500 }
    );
  }
}
