import { NextRequest, NextResponse } from "next/server";
import { productImportService } from '../../../../lib/services/product-import.service';
import { safeLog, logDebug, safeLogError } from '../../../../lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    logDebug('API universal-import - начало импорта');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const catalogCategoryId = formData.get('catalogCategoryId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    if (!catalogCategoryId) {
      return NextResponse.json(
        { error: 'Не указана категория каталога' },
        { status: 400 }
      );
    }

    safeLog(`📁 Импорт файла: ${file.name}, размер: ${file.size} байт`);
    safeLog(`📂 Категория: ${catalogCategoryId}`);

    const buffer = await file.arrayBuffer();
    const result = await productImportService.importFromExcel(
      buffer,
      catalogCategoryId
    );

    if (result.success) {
      safeLog(`✅ Импорт завершен успешно: ${result.imported} товаров`);
      return NextResponse.json({
        success: true,
        message: `Успешно импортировано ${result.imported} товаров`,
        imported: result.imported,
        errors: result.errors
      });
    } else {
      safeLogError('❌ Ошибка импорта:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message,
        imported: result.imported,
        errors: result.errors
      }, { status: 400 });
    }
  } catch (error) {
    safeLogError('❌ API universal-import - критическая ошибка:', error);
    return NextResponse.json(
      { 
        error: 'Критическая ошибка импорта',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
