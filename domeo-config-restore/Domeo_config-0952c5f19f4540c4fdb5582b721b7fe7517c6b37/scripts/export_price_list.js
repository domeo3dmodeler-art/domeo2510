const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportPriceListToExcel() {
  try {
    console.log('🔧 ЭКСПОРТ ПРАЙСА В EXCEL ИЗ БАЗЫ ДАННЫХ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем ВСЕ товары категории без ограничений
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        base_price: true,
        stock_quantity: true
      }
      // Убираем take - экспортируем все товары
    });

    console.log(`📦 Найдено товаров для экспорта: ${products.length}\n`);

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

    // Создаем имя файла
    const fileName = `price_Межкомнатные_двери_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Сохраняем Excel файл
    XLSX.writeFile(workbook, fileName);

    console.log(`🎉 ЭКСПОРТ В EXCEL ЗАВЕРШЕН!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Файл создан: ${fileName}`);
    console.log(`   - Формат: Excel (.xlsx)`);
    console.log(`   - Кодировка: UTF-8`);
    console.log(`   - Строк данных: ${data.length + 1} (включая заголовок)`);

  } catch (error) {
    console.error('❌ Ошибка при экспорте прайса в Excel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportPriceListToExcel();