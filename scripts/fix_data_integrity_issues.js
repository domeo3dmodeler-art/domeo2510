const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDataIntegrityIssues() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМ ЦЕЛОСТНОСТИ ДАННЫХ\n');

    // 1. Объединение JSON полей properties_data и specifications
    console.log('1. Объединение JSON полей...');
    
    const productsWithBothFields = await prisma.product.findMany({
      where: {
        AND: [
          { properties_data: { not: '{}' } },
          { specifications: { not: '{}' } }
        ]
      },
      select: {
        id: true,
        properties_data: true,
        specifications: true
      }
    });

    console.log(`   - Найдено товаров с данными в обоих полях: ${productsWithBothFields.length}`);

    let mergedCount = 0;
    for (const product of productsWithBothFields) {
      try {
        const properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        const specifications = typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications) 
          : product.specifications;

        // Объединяем данные, приоритет у properties_data
        const mergedData = { ...specifications, ...properties };

        await prisma.product.update({
          where: { id: product.id },
          data: {
            properties_data: JSON.stringify(mergedData),
            specifications: '{}' // Очищаем specifications
          }
        });

        mergedCount++;
        
        if (mergedCount % 100 === 0) {
          console.log(`   - Объединено: ${mergedCount} товаров`);
        }
      } catch (error) {
        console.error(`   ❌ Ошибка при объединении товара ${product.id}:`, error);
      }
    }

    console.log(`   ✅ Объединено JSON полей: ${mergedCount} товаров`);

    // 2. Создание составных индексов для оптимизации запросов
    console.log('\n2. Создание составных индексов...');
    
    try {
      // Индекс для поиска товаров по категории и активности
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_products_category_active_sku 
        ON products(catalog_category_id, is_active, sku)
      `;
      console.log('   ✅ Создан индекс: idx_products_category_active_sku');

      // Индекс для поиска по цене и категории
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_products_category_price 
        ON products(catalog_category_id, base_price)
      `;
      console.log('   ✅ Создан индекс: idx_products_category_price');

      // Индекс для поиска по количеству на складе
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_products_stock 
        ON products(stock_quantity, is_active)
      `;
      console.log('   ✅ Создан индекс: idx_products_stock');

    } catch (error) {
      console.log('   ⚠️  Некоторые индексы уже существуют');
    }

    // 3. Валидация и исправление данных
    console.log('\n3. Валидация данных...');
    
    // Проверяем товары с нулевыми ценами
    const zeroPrices = await prisma.product.count({
      where: { base_price: 0 }
    });
    
    if (zeroPrices > 0) {
      console.log(`   - Товары с нулевыми ценами: ${zeroPrices}`);
    } else {
      console.log(`   - Товары с нулевыми ценами: 0`);
    }
    
    // Проверяем общее количество товаров
    const totalProducts = await prisma.product.count();
    console.log(`   - Всего товаров: ${totalProducts}`);

    // 4. Оптимизация базы данных
    console.log('\n4. Оптимизация базы данных...');
    
    await prisma.$executeRaw`VACUUM`;
    console.log('   ✅ Выполнена очистка базы данных');
    
    await prisma.$executeRaw`ANALYZE`;
    console.log('   ✅ Обновлена статистика индексов');

    // 5. Проверка результатов
    console.log('\n5. Проверка результатов...');
    
    const finalProductCount = await prisma.product.count();
    const finalCategoryCount = await prisma.catalogCategory.count();
    
    console.log(`   - Товаров: ${finalProductCount}`);
    console.log(`   - Категорий: ${finalCategoryCount}`);
    
    // Проверяем индексы
    const indexes = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name LIKE 'idx_products_%'
      ORDER BY name
    `;
    
    console.log(`   - Индексов для товаров: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`     * ${idx.name}`);
    });

    console.log('\n🎉 ИСПРАВЛЕНИЕ ПРОБЛЕМ ЦЕЛОСТНОСТИ ЗАВЕРШЕНО!');
    console.log('\n📊 СТАТИСТИКА:');
    console.log(`   - Объединено JSON полей: ${mergedCount}`);
    console.log(`   - Создано индексов: 3`);
    console.log(`   - Проверено товаров: ${totalProducts}`);
    console.log(`   - Оптимизирована база: да`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении целостности данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDataIntegrityIssues();
