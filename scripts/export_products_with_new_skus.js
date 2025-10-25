const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportProductsWithNewSkus() {
  try {
    console.log('🚀 Экспортируем товары с новыми SKU...');
    
    // Получаем все товары из категории "Межкомнатные двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        base_price: true,
        stock_quantity: true,
        properties_data: true,
        created_at: true,
        updated_at: true
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров для экспорта`);
    
    // Подготавливаем данные для Excel
    const excelData = [];
    
    // Заголовки
    const headers = [
      'SKU',
      'Name', 
      'Price',
      'StockQuantity',
      'ModelName',
      'Style',
      'Finish',
      'Color',
      'Width',
      'Height',
      'Thickness',
      'Unit',
      'Availability',
      'Supplier',
      'OpeningType',
      'Edge',
      'EdgeCost',
      'Molding',
      'Glass',
      'HardwareName',
      'HardwareDescription',
      'PriceGroup',
      'Photos',
      'CreatedAt',
      'UpdatedAt'
    ];
    
    excelData.push(headers);
    
    // Обрабатываем каждый товар
    for (const product of products) {
      try {
        // Парсим properties_data
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.log(`⚠️ Ошибка парсинга properties_data для товара ${product.id}`);
            continue;
          }
        }
        
        // Создаем строку данных
        const row = [
          product.sku, // SKU
          product.name || '', // Name
          product.base_price || 0, // Price
          product.stock_quantity || 0, // StockQuantity
          properties['Domeo_Название модели для Web'] || '', // ModelName
          properties['Domeo_Стиль Web'] || '', // Style
          properties['Общее_Тип покрытия'] || '', // Finish
          properties['Domeo_Цвет'] || '', // Color
          properties['Ширина/мм'] || '', // Width
          properties['Высота/мм'] || '', // Height
          properties['Толщина/мм'] || '', // Thickness
          properties['Ед.изм.'] || 'шт', // Unit
          properties['Наличие'] || '', // Availability
          properties['Поставщик'] || '', // Supplier
          properties['Тип открывания'] || '', // OpeningType
          properties['Кромка'] || '', // Edge
          properties['Стоимость кромки'] || '', // EdgeCost
          properties['Наличник'] || '', // Molding
          properties['Стекло'] || '', // Glass
          properties['Фурнитура_Название фурнитуры'] || '', // HardwareName
          properties['Фурнитура_Описание фурнитуры'] || '', // HardwareDescription
          properties['Ценовая группа'] || '', // PriceGroup
          Array.isArray(properties['photos']) ? properties['photos'].join(';') : '', // Photos
          product.created_at ? new Date(product.created_at).toISOString() : '', // CreatedAt
          product.updated_at ? new Date(product.updated_at).toISOString() : '' // UpdatedAt
        ];
        
        excelData.push(row);
        
      } catch (error) {
        console.log(`⚠️ Ошибка обработки товара ${product.id}: ${error.message}`);
      }
    }
    
    // Создаем Excel файл
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    // Сохраняем файл
    const fileName = `products_with_new_skus_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(__dirname, '..', fileName);
    
    XLSX.writeFile(wb, filePath);
    
    console.log(`✅ Файл экспорта создан: ${fileName}`);
    console.log(`📁 Путь: ${filePath}`);
    console.log(`📊 Экспортировано строк: ${excelData.length - 1} (включая заголовки)`);
    
    // Статистика по SKU
    const skuStats = {};
    products.forEach(product => {
      const skuPrefix = product.sku.split('_')[0];
      skuStats[skuPrefix] = (skuStats[skuPrefix] || 0) + 1;
    });
    
    console.log('\n📊 Статистика по типам SKU:');
    Object.entries(skuStats).forEach(([prefix, count]) => {
      console.log(`  - ${prefix}: ${count} товаров`);
    });
    
    // Проверяем уникальность SKU
    const allSkus = products.map(p => p.sku);
    const uniqueSkus = new Set(allSkus);
    
    console.log('\n🔍 Проверка уникальности:');
    console.log(`📊 Всего товаров: ${products.length}`);
    console.log(`📊 Уникальных SKU: ${uniqueSkus.size}`);
    console.log(`📊 Дубликатов: ${products.length - uniqueSkus.size}`);
    
    if (products.length === uniqueSkus.size) {
      console.log('✅ Все SKU уникальны!');
    } else {
      console.log('⚠️ Найдены дубликаты SKU');
    }
    
    console.log('\n🎉 Экспорт завершен!');
    console.log('\n📋 Инструкция по использованию:');
    console.log('1. Откройте файл Excel');
    console.log('2. Измените нужные поля (цена, количество, описание и т.д.)');
    console.log('3. Сохраните файл');
    console.log('4. Используйте новый API /api/admin/simple-import для загрузки');
    console.log('5. Система найдет товары по SKU и обновит только измененные поля');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportProductsWithNewSkus();
