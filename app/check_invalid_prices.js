const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInvalidPrices() {
  console.log('🔍 Поиск товаров с некорректными ценами...');
  
  try {
    // Получаем все товары
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        base_price: true,
        properties_data: true,
        catalog_category: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📦 Загружено ${products.length} товаров из БД`);

    const invalidProducts = [];

    for (const product of products) {
      try {
        const properties = product.properties_data ? 
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        // Проверяем различные варианты названий полей цен
        const priceFields = [
          'РРЦ',
          'РРЦ цена',
          'РРЦ_цена',
          'RRP',
          'Retail Price',
          'Рекомендованная розничная цена',
          'Цена РРЦ',
          'Цена_РРЦ',
          'Розничная цена',
          'Розничная_цена'
        ];

        const wholesalePriceFields = [
          'Цена опт',
          'Цена_опт',
          'Оптовая цена',
          'Оптовая_цена',
          'Wholesale Price',
          'Опт',
          'Опт_цена',
          'Wholesale',
          'Оптовая',
          'Оптовая_цена'
        ];

        let retailPrice = null;
        let wholesalePrice = null;
        let retailPriceField = null;
        let wholesalePriceField = null;

        // Ищем розничную цену
        for (const field of priceFields) {
          if (properties[field] !== undefined && properties[field] !== null) {
            retailPrice = properties[field];
            retailPriceField = field;
            break;
          }
        }

        // Ищем оптовую цену
        for (const field of wholesalePriceFields) {
          if (properties[field] !== undefined && properties[field] !== null) {
            wholesalePrice = properties[field];
            wholesalePriceField = field;
            break;
          }
        }

        // Проверяем базовую цену
        const basePrice = product.base_price;

        // Функция для проверки валидности цены
        function isValidPrice(price) {
          if (price === null || price === undefined || price === '') {
            return false;
          }
          
          // Проверяем, что это число
          const numPrice = parseFloat(price);
          if (isNaN(numPrice)) {
            return false;
          }
          
          // Проверяем, что цена больше 0
          if (numPrice <= 0) {
            return false;
          }
          
          return true;
        }

        // Проверяем все цены
        const hasInvalidRetailPrice = !isValidPrice(retailPrice);
        const hasInvalidWholesalePrice = !isValidPrice(wholesalePrice);
        const hasInvalidBasePrice = !isValidPrice(basePrice);

        // Если есть проблемы с ценами, добавляем в список
        if (hasInvalidRetailPrice || hasInvalidWholesalePrice || hasInvalidBasePrice) {
          invalidProducts.push({
            id: product.id,
            sku: product.sku,
            name: product.name,
            category: product.catalog_category.name,
            base_price: basePrice,
            retail_price: retailPrice,
            wholesale_price: wholesalePrice,
            retail_price_field: retailPriceField,
            wholesale_price_field: wholesalePriceField,
            issues: {
              invalid_base_price: hasInvalidBasePrice,
              invalid_retail_price: hasInvalidRetailPrice,
              invalid_wholesale_price: hasInvalidWholesalePrice
            },
            properties_data: properties
          });
        }

      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error.message);
      }
    }

    console.log(`\n❌ Найдено ${invalidProducts.length} товаров с некорректными ценами:`);

    // Группируем по категориям
    const groupedByCategory = {};
    invalidProducts.forEach(product => {
      if (!groupedByCategory[product.category]) {
        groupedByCategory[product.category] = [];
      }
      groupedByCategory[product.category].push(product);
    });

    // Выводим результаты по категориям
    Object.keys(groupedByCategory).forEach(category => {
      console.log(`\n📁 ${category}: ${groupedByCategory[category].length} товаров`);
      
      groupedByCategory[category].forEach(product => {
        console.log(`  • ${product.sku} - ${product.name}`);
        console.log(`    Базовая цена: ${product.base_price}`);
        console.log(`    РРЦ (${product.retail_price_field}): ${product.retail_price}`);
        console.log(`    Опт (${product.wholesale_price_field}): ${product.wholesale_price}`);
        
        const issues = [];
        if (product.issues.invalid_base_price) issues.push('некорректная базовая цена');
        if (product.issues.invalid_retail_price) issues.push('некорректная РРЦ');
        if (product.issues.invalid_wholesale_price) issues.push('некорректная оптовая цена');
        
        console.log(`    Проблемы: ${issues.join(', ')}`);
        console.log('');
      });
    });

    // Создаем CSV файл
    const fs = require('fs');
    const csvContent = [
      'ID,SKU,Название,Категория,Базовая цена,РРЦ поле,РРЦ значение,Опт поле,Опт значение,Проблемы',
      ...invalidProducts.map(product => {
        const issues = [];
        if (product.issues.invalid_base_price) issues.push('базовая цена');
        if (product.issues.invalid_retail_price) issues.push('РРЦ');
        if (product.issues.invalid_wholesale_price) issues.push('оптовая цена');
        
        return [
          product.id,
          product.sku,
          `"${product.name}"`,
          `"${product.category}"`,
          product.base_price || '',
          product.retail_price_field || '',
          product.retail_price || '',
          product.wholesale_price_field || '',
          product.wholesale_price || '',
          `"${issues.join('; ')}"`
        ].join(',');
      })
    ].join('\n');

    const fileName = `invalid_prices_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(fileName, csvContent, 'utf8');
    console.log(`\n📄 Файл с результатами сохранен: ${fileName}`);

    // Создаем JSON файл для детального анализа
    const jsonFileName = `invalid_prices_detailed_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(jsonFileName, JSON.stringify(invalidProducts, null, 2), 'utf8');
    console.log(`📄 Детальный JSON файл сохранен: ${jsonFileName}`);

    return invalidProducts;

  } catch (error) {
    console.error('❌ Ошибка при проверке цен:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем проверку
checkInvalidPrices()
  .then(products => {
    console.log(`\n✅ Проверка завершена. Найдено ${products.length} товаров с проблемами цен.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
