import { NextRequest, NextResponse } from 'next/server';
import { exportService } from '@/lib/services/export.service';

// POST /api/catalog/export/config - Сохранить настройки экспорта
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { catalogCategoryId, exportType, config } = data;

    if (!catalogCategoryId) {
      return NextResponse.json(
        { error: 'ID категории каталога не указан' },
        { status: 400 }
      );
    }

    if (!exportType || !['quote', 'invoice', 'supplier_order'].includes(exportType)) {
      return NextResponse.json(
        { error: 'Неверный тип экспорта' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Конфигурация не предоставлена' },
        { status: 400 }
      );
    }

    await exportService.saveExportConfig(catalogCategoryId, exportType, config);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving export config:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек экспорта' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/export/config - Удалить настройки экспорта
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');
    const exportType = searchParams.get('exportType');

    if (!catalogCategoryId) {
      return NextResponse.json(
        { error: 'ID категории каталога не указан' },
        { status: 400 }
      );
    }

    if (!exportType || !['quote', 'invoice', 'supplier_order'].includes(exportType)) {
      return NextResponse.json(
        { error: 'Неверный тип экспорта' },
        { status: 400 }
      );
    }

    await exportService.deleteExportConfig(catalogCategoryId, exportType as 'quote' | 'invoice' | 'supplier_order');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting export config:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении настроек экспорта' },
      { status: 500 }
    );
  }
}
