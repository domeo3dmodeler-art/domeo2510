const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPrices() {
  console.log('🔧 Исправление цен товаров...');
  
  try {
    // Получаем все товары с проблемами цен
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

    let fixedCount = 0;
    const fixedProducts = [];

    for (const product of products) {
      try {
        const properties = product.properties_data ? 
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        // Ищем оптовую цену
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

        let wholesalePrice = null;
        let wholesalePriceField = null;

        for (const field of wholesalePriceFields) {
          if (properties[field] !== undefined && properties[field] !== null) {
            wholesalePrice = properties[field];
            wholesalePriceField = field;
            break;
          }
        }

        // Проверяем, нуждается ли товар в исправлении
        const needsBasePriceFix = product.base_price === 0 || product.base_price === null;
        const needsRetailPriceFix = !properties['РРЦ'] && !properties['РРЦ цена'] && !properties['RRP'];

        if (needsBasePriceFix || needsRetailPriceFix) {
          const updates = {};

          // Исправляем базовую цену
          if (needsBasePriceFix && wholesalePrice && parseFloat(wholesalePrice) > 0) {
            updates.base_price = parseFloat(wholesalePrice);
            console.log(`✅ ${product.sku}: базовая цена ${product.base_price} → ${wholesalePrice}`);
          }

          // Добавляем РРЦ
          if (needsRetailPriceFix && wholesalePrice && parseFloat(wholesalePrice) > 0) {
            const retailPrice = Math.round(parseFloat(wholesalePrice) * 1.3); // +30% наценка
            properties['РРЦ'] = retailPrice;
            updates.properties_data = JSON.stringify(properties);
            console.log(`✅ ${product.sku}: добавлена РРЦ ${retailPrice} (опт: ${wholesalePrice})`);
          }

          // Обновляем товар в БД
          if (Object.keys(updates).length > 0) {
            await prisma.product.update({
              where: { id: product.id },
              data: updates
            });

            fixedProducts.push({
              sku: product.sku,
              name: product.name,
              category: product.catalog_category.name,
              old_base_price: product.base_price,
              new_base_price: updates.base_price || product.base_price,
              wholesale_price: wholesalePrice,
              retail_price: properties['РРЦ'],
              wholesale_field: wholesalePriceField
            });

            fixedCount++;
          }
        }

      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error.message);
      }
    }

    console.log(`\n✅ Исправлено ${fixedCount} товаров`);

    // Создаем отчет об исправлениях
    const fs = require('fs');
    const reportContent = [
      'SKU,Название,Категория,Старая базовая цена,Новая базовая цена,Оптовая цена,РРЦ,Поле оптовой цены',
      ...fixedProducts.map(product => [
        product.sku,
        `"${product.name}"`,
        `"${product.category}"`,
        product.old_base_price || '',
        product.new_base_price || '',
        product.wholesale_price || '',
        product.retail_price || '',
        product.wholesale_field || ''
      ].join(','))
    ].join('\n');

    const fileName = `price_fixes_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(fileName, reportContent, 'utf8');
    console.log(`📄 Отчет об исправлениях сохранен: ${fileName}`);

    // Статистика по категориям
    const categoryStats = {};
    fixedProducts.forEach(product => {
      if (!categoryStats[product.category]) {
        categoryStats[product.category] = 0;
      }
      categoryStats[product.category]++;
    });

    console.log('\n📊 Статистика по категориям:');
    Object.keys(categoryStats).forEach(category => {
      console.log(`  ${category}: ${categoryStats[category]} товаров`);
    });

    return fixedProducts;

  } catch (error) {
    console.error('❌ Ошибка при исправлении цен:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixPrices()
  .then(products => {
    console.log(`\n🎉 Исправление завершено. Обработано ${products.length} товаров.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
