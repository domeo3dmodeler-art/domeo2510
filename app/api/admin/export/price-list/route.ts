import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { apiErrorHandler } from '@/lib/api-error-handler';
import { apiValidator } from '@/lib/api-validator';
import { validateAndFixData } from '@/lib/encoding-utils';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');
    
    // Валидация параметров
    apiValidator.validateId(catalogCategoryId!, 'catalogCategoryId');

    console.log('🔍 Экспорт прайса в Excel для категории:', catalogCategoryId);

    // Получаем категорию
    const category = await prisma.catalogCategory.findUnique({
      where: { id: catalogCategoryId },
      select: { name: true }
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    console.log('📂 Категория найдена:', category.name);

    // Получаем товары с ограничением для производительности
    const products = await prisma.product.findMany({
      where: { catalog_category_id: catalogCategoryId },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        base_price: true,
        stock_quantity: true
      },
      take: 10000, // Ограничиваем до 10,000 товаров для производительности
      orderBy: { sku: 'asc' }
    });

    console.log(`📦 Найдено товаров для экспорта: ${products.length}`);

    // Получаем шаблон для fallback
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: catalogCategoryId }
    });

    // Получаем настройки экспорта
    const exportConfigResponse = await fetch(`${req.url.split('/api')[0]}/api/admin/export/config?catalogCategoryId=${catalogCategoryId}&exportType=price_list`);
    let exportConfig = null;
    
    if (exportConfigResponse.ok) {
      const configData = await exportConfigResponse.json();
      if (configData.success) {
        exportConfig = configData.config;
      }
    }

    // Собираем все уникальные поля свойств из всех товаров
    const allPropertyFields = new Set<string>();
    
    products.forEach(product => {
      if (product.properties_data) {
        try {
          const properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
          
          Object.keys(properties).forEach(key => {
            if (key && key.trim() !== '') {
              allPropertyFields.add(key);
            }
          });
        } catch (e) {
          console.warn(`Ошибка парсинга свойств для товара ${product.id}:`, e);
        }
      }
    });

    // Сортируем поля для консистентности
    let sortedPropertyFields = Array.from(allPropertyFields).sort();
    
    // Проверяем, есть ли "SKU внутреннее" в properties
    const skuInternalField = 'SKU внутреннее';
    const hasSkuInternal = sortedPropertyFields.includes(skuInternalField);
    
    // Убираем "SKU внутреннее" из сортированного списка (если есть)
    if (hasSkuInternal) {
      sortedPropertyFields = sortedPropertyFields.filter(field => field !== skuInternalField);
    }
    
    // Проверяем, есть ли поля цен в properties
    // Варианты названий для цены РРЦ
    const priceRrcVariants = [
      'Цена ррц (включая цену полотна, короба, наличников, доборов)',
      'Цена РРЦ',
      'Цена ррц',
      'Цена розница',
      'РРЦ'
    ];
    
    // Варианты названий для цены опт
    const priceOptVariants = [
      'Цена опт',
      'Цена оптовая',
      'Опт'
    ];
    
    // Проверяем, есть ли уже эти поля в properties
    // НЕ удаляем их из sortedPropertyFields - они должны остаться в экспорте
    const hasPriceRrc = priceRrcVariants.some(variant => sortedPropertyFields.includes(variant));
    const hasPriceOpt = priceOptVariants.some(variant => sortedPropertyFields.includes(variant));
    
    // Создаем заголовки
    // "SKU внутреннее" всегда в начале (из properties, если есть, иначе из product.sku)
    // Затем все остальные поля свойств (ВКЛЮЧАЯ поля цен, если они есть в properties)
    // Затем добавляем стандартные поля цен в конце ТОЛЬКО если их нет в properties
    const headers = [
      skuInternalField, // Всегда в начале
      ...sortedPropertyFields, // Все поля свойств (включая цены, если они есть)
      ...(hasPriceRrc ? [] : ['Цена ррц (включая цену полотна, короба, наличников, доборов)']),
      ...(hasPriceOpt ? [] : ['Цена опт'])
    ];
    
    const data = [];

    // Добавляем данные товаров
    products.forEach((product, index) => {
      const row = [];

      // Парсим свойства товара с исправлением кодировки
      let properties = {};
      if (product.properties_data) {
        try {
          const rawProperties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
          properties = validateAndFixData(rawProperties);
        } catch (e) {
          console.error(`Ошибка парсинга свойств для товара ${product.id}:`, e);
        }
      }

      // SKU внутреннее всегда первое - берем из properties, если есть, иначе из product.sku
      const skuValue = hasSkuInternal 
        ? (properties[skuInternalField] || product.sku || '')
        : (product.sku || '');
      row.push(skuValue || '-');

      // Добавляем все поля свойств в том же порядке (без "SKU внутреннее" и цен, если они были)
      sortedPropertyFields.forEach(field => {
        const value = properties[field];
        
        // Обрабатываем пустые значения
        if (value === undefined || value === null || value === '') {
          row.push('-');
        } else {
          // Проверяем, является ли значение числом
          if (typeof value === 'number' || !isNaN(Number(value))) {
            row.push(Number(value));
          } else {
            row.push(String(value));
          }
        }
      });

      // Добавляем цену ррц только если её нет в properties
      if (!hasPriceRrc) {
        const priceRrcFull = properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'] 
          || properties['Цена РРЦ'] 
          || properties['Цена ррц']
          || properties['Цена розница']
          || '';
        row.push(priceRrcFull && !isNaN(Number(priceRrcFull)) ? Number(priceRrcFull) : '-');
      }

      // Добавляем цену опт только если её нет в properties
      if (!hasPriceOpt) {
        const priceOpt = properties['Цена опт'] || properties['Цена оптовая'] || '';
        row.push(priceOpt && !isNaN(Number(priceOpt)) ? Number(priceOpt) : '-');
      }

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
    return apiErrorHandler.handle(error, 'price-list-export');
  }
}