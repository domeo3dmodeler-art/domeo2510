const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function analyzeDatabasePerformance() {
  try {
    console.log('🔍 АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ БАЗЫ ДАННЫХ\n');

    // Анализ таблиц
    console.log('📊 СТАТИСТИКА ТАБЛИЦ:');
    
    const tables = [
      'products',
      'catalog_categories', 
      'product_images',
      'product_properties',
      'import_templates',
      'users'
    ];

    for (const table of tables) {
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${table}`;
        console.log(`   - ${table}: ${count[0].count} записей`);
      } catch (error) {
        console.log(`   - ${table}: ошибка доступа`);
      }
    }

    console.log('\n🔍 АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ ЗАПРОСОВ:');

    // Тест 1: Поиск товаров по категории
    console.log('\n1. Поиск товаров по категории:');
    const start1 = Date.now();
    const products = await prisma.product.findMany({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' },
      select: { id: true, sku: true, name: true },
      take: 100
    });
    const time1 = Date.now() - start1;
    console.log(`   - Время: ${time1}ms`);
    console.log(`   - Найдено: ${products.length} товаров`);

    // Тест 2: Поиск с фильтрацией по свойствам
    console.log('\n2. Поиск с фильтрацией по свойствам:');
    const start2 = Date.now();
    const filteredProducts = await prisma.product.findMany({
      where: { 
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo',
        properties_data: { contains: 'Белый' }
      },
      select: { id: true, sku: true, name: true },
      take: 50
    });
    const time2 = Date.now() - start2;
    console.log(`   - Время: ${time2}ms`);
    console.log(`   - Найдено: ${filteredProducts.length} товаров`);

    // Тест 3: Подсчет товаров в категории
    console.log('\n3. Подсчет товаров в категории:');
    const start3 = Date.now();
    const count = await prisma.product.count({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    const time3 = Date.now() - start3;
    console.log(`   - Время: ${time3}ms`);
    console.log(`   - Всего товаров: ${count}`);

    // Анализ индексов
    console.log('\n📈 АНАЛИЗ ИНДЕКСОВ:');
    try {
      const indexes = await prisma.$queryRaw`
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND sql IS NOT NULL
      `;
      console.log(`   - Найдено индексов: ${indexes.length}`);
      indexes.forEach(index => {
        console.log(`     * ${index.name}`);
      });
    } catch (error) {
      console.log('   - Ошибка получения индексов');
    }

    // Рекомендации по оптимизации
    console.log('\n💡 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ:');
    
    if (time1 > 100) {
      console.log('   ⚠️  Медленный поиск по категории - нужен индекс на catalog_category_id');
    }
    
    if (time2 > 200) {
      console.log('   ⚠️  Медленный поиск по свойствам - нужна оптимизация JSON полей');
    }
    
    if (time3 > 50) {
      console.log('   ⚠️  Медленный подсчет - нужен индекс на catalog_category_id');
    }

    console.log('\n🔧 ПЛАН ОПТИМИЗАЦИИ:');
    console.log('   1. Создать индексы на часто используемые поля');
    console.log('   2. Оптимизировать JSON поля properties_data');
    console.log('   3. Добавить виртуальные колонки для часто используемых свойств');
    console.log('   4. Настроить PRAGMA параметры SQLite');

  } catch (error) {
    console.error('❌ Ошибка при анализе производительности:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabasePerformance();
