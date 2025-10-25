const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeDatabaseIntegrity() {
  try {
    console.log('🔍 АНАЛИЗ ПРОБЛЕМ ЦЕЛОСТНОСТИ ДАННЫХ\n');

    // 1. Проверка дублирования JSON в разных полях
    console.log('1. Проверка дублирования JSON полей:');
    
    const productsWithBothFields = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE properties_data != '{}' AND specifications != '{}'
    `;
    
    console.log(`   - Товары с данными в обоих полях: ${productsWithBothFields[0].count}`);

    // 2. Проверка товаров с несуществующими категориями
    console.log('\n2. Проверка внешних ключей:');
    
    const orphanProducts = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN catalog_categories c ON p.catalog_category_id = c.id
      WHERE c.id IS NULL
    `;
    
    console.log(`   - Товары с несуществующими категориями: ${orphanProducts[0].count}`);

    // 3. Проверка отрицательных цен
    console.log('\n3. Проверка валидации данных:');
    
    const negativePrices = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products
      WHERE base_price < 0
    `;
    
    console.log(`   - Товары с отрицательными ценами: ${negativePrices[0].count}`);

    // 4. Проверка дублирования SKU
    console.log('\n4. Проверка уникальности SKU:');
    
    const duplicateSkus = await prisma.$queryRaw`
      SELECT sku, COUNT(*) as count
      FROM products
      GROUP BY sku
      HAVING COUNT(*) > 1
      LIMIT 5
    `;
    
    console.log(`   - Дублированные SKU: ${duplicateSkus.length}`);
    duplicateSkus.forEach(dup => {
      console.log(`     * ${dup.sku}: ${dup.count} раз`);
    });

    // 5. Анализ индексов
    console.log('\n5. Анализ индексов:');
    
    const indexes = await prisma.$queryRaw`
      SELECT name, sql FROM sqlite_master 
      WHERE type='index' AND sql IS NOT NULL
      ORDER BY name
    `;
    
    console.log(`   - Всего индексов: ${indexes.length}`);
    
    // Проверяем составные индексы
    const compositeIndexes = indexes.filter(idx => 
      idx.sql && idx.sql.includes('catalog_category_id') && idx.sql.includes('sku')
    );
    console.log(`   - Составные индексы: ${compositeIndexes.length}`);

    // 6. Проверка размера базы данных
    console.log('\n6. Анализ размера данных:');
    
    console.log('   - Размеры таблиц:');
    
    const productCount = await prisma.product.count();
    console.log(`     * products: ${productCount} записей`);
    
    const categoryCount = await prisma.catalogCategory.count();
    console.log(`     * catalog_categories: ${categoryCount} записей`);
    
    const imageCount = await prisma.productImage.count();
    console.log(`     * product_images: ${imageCount} записей`);

    console.log('\n💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
    console.log('   1. Добавить внешние ключи с проверкой данных');
    console.log('   2. Объединить JSON поля в одно');
    console.log('   3. Добавить валидацию на уровне Prisma');
    console.log('   4. Создать составные индексы');
    console.log('   5. Реализовать транзакции для критических операций');

  } catch (error) {
    console.error('❌ Ошибка при анализе целостности данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabaseIntegrity();
