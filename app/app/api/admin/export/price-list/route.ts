import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');

    console.log('🔍 Экспорт прайса в Excel для категории:', catalogCategoryId);

    if (!catalogCategoryId) {
      return NextResponse.json({ success: false, error: 'catalogCategoryId is required' }, { status: 400 });
    }

    // Получаем категорию
    const category = await prisma.catalogCategory.findUnique({
      where: { id: catalogCategoryId },
      select: { name: true }
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    console.log('📂 Категория найдена:', category.name);

    // Получаем ВСЕ товары без ограничений
    const products = await prisma.product.findMany({
      where: { catalog_category_id: catalogCategoryId },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        base_price: true,
        stock_quantity: true
      }
      // Убираем take: 100 - экспортируем все товары
    });

    console.log(`📦 Найдено товаров для экспорта: ${products.length}`);

    // Создаем заголовки для Excel
    const headers = [
      '№', 'SKU', 'Название', 'Артикул поставщика', 'Ширина/мм', 'Высота/мм', 
      'Толщина/мм', 'Цвет', 'Стиль', 'Тип конструкции', 'Тип открывания', 
      'Поставщик', 'Цена ррц', 'Цена опт', 'Цена базовая', 'Остаток'
    ];
    
    const data = [];

    // Добавляем данные товаров
    products.forEach((product, index) => {
      const row = [];
      
      // Номер строки
      row.push(index + 1);
      
      // SKU и название
      row.push(product.sku || '');
      row.push(product.name || 'Без названия');

      // Парсим свойства товара
      let properties = {};
      if (product.properties_data) {
        try {
          properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
        } catch (e) {
          console.error(`Ошибка парсинга свойств для товара ${product.id}:`, e);
        }
      }

      // Добавляем основные поля
      row.push(properties['Артикул поставщика'] || '');
      row.push(properties['Ширина/мм'] || '');
      row.push(properties['Высота/мм'] || '');
      row.push(properties['Толщина/мм'] || '');
      row.push(properties['Domeo_Цвет'] || '');
      row.push(properties['Domeo_Стиль Web'] || '');
      row.push(properties['Тип конструкции'] || '');
      row.push(properties['Тип открывания'] || '');
      row.push(properties['Поставщик'] || '');
      row.push(properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'] || '');
      row.push(properties['Цена опт'] || '');

      // Добавляем базовую цену и остаток
      row.push(product.base_price || 0);
      row.push(product.stock_quantity || 0);

      data.push(row);
    });

    // Создаем Excel файл
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Прайс');

    // Генерируем Excel файл
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    // Создаем безопасное имя файла
    const safeCategoryName = category.name.replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '_');
    const fileName = `price_${safeCategoryName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    console.log('✅ Excel файл создан:', fileName, `(${products.length} товаров)`);

    // Возвращаем Excel файл
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Error exporting price list to Excel:', error);
    return NextResponse.json(
      { success: false, error: `Failed to export price list: ${error.message}` },
      { status: 500 }
    );
  }
}