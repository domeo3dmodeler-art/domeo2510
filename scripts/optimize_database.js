const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function optimizeDatabase() {
  try {
    console.log('🔧 ОПТИМИЗАЦИЯ БАЗЫ ДАННЫХ\n');

    // 1. Настройка PRAGMA параметров SQLite
    console.log('1. Настройка PRAGMA параметров SQLite...');
    
    // Используем $queryRaw для PRAGMA команд
    await prisma.$queryRaw`PRAGMA journal_mode = WAL`;
    await prisma.$queryRaw`PRAGMA synchronous = NORMAL`;
    await prisma.$queryRaw`PRAGMA cache_size = 10000`;
    await prisma.$queryRaw`PRAGMA temp_store = MEMORY`;
    await prisma.$queryRaw`PRAGMA mmap_size = 268435456`;
    
    console.log('   ✅ PRAGMA параметры настроены');

    // 2. Анализ и оптимизация таблиц
    console.log('\n2. Анализ таблиц...');
    
    await prisma.$queryRaw`ANALYZE`;
    console.log('   ✅ Анализ таблиц выполнен');

    // 3. Проверка существующих индексов
    console.log('\n3. Проверка индексов...');
    
    const indexes = await prisma.$queryRaw`
      SELECT name, sql FROM sqlite_master 
      WHERE type='index' AND sql IS NOT NULL
      ORDER BY name
    `;
    
    console.log(`   ✅ Найдено индексов: ${indexes.length}`);
    
    // Показываем ключевые индексы
    const keyIndexes = indexes.filter(idx => 
      idx.name.includes('products') || 
      idx.name.includes('catalog_category')
    );
    
    console.log('   📋 Ключевые индексы:');
    keyIndexes.forEach(idx => {
      console.log(`     - ${idx.name}`);
    });

    // 4. Проверка производительности после оптимизации
    console.log('\n4. Тест производительности после оптимизации...');
    
    // Тест поиска товаров
    const start1 = Date.now();
    const products = await prisma.product.findMany({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' },
      select: { id: true, sku: true, name: true },
      take: 100
    });
    const time1 = Date.now() - start1;
    
    // Тест подсчета
    const start2 = Date.now();
    const count = await prisma.product.count({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    const time2 = Date.now() - start2;
    
    console.log(`   📊 Результаты тестов:`);
    console.log(`     - Поиск 100 товаров: ${time1}ms`);
    console.log(`     - Подсчет товаров: ${time2}ms`);
    console.log(`     - Найдено товаров: ${count}`);

    // 5. Рекомендации по дальнейшей оптимизации
    console.log('\n5. Рекомендации по дальнейшей оптимизации:');
    
    if (time1 > 50) {
      console.log('   ⚠️  Поиск товаров можно ускорить');
    } else {
      console.log('   ✅ Поиск товаров работает быстро');
    }
    
    if (time2 > 30) {
      console.log('   ⚠️  Подсчет товаров можно ускорить');
    } else {
      console.log('   ✅ Подсчет товаров работает быстро');
    }

    console.log('\n💡 Дополнительные рекомендации:');
    console.log('   - Регулярно выполнять ANALYZE для обновления статистики');
    console.log('   - Мониторить медленные запросы');
    console.log('   - Рассмотреть кэширование часто используемых данных');
    console.log('   - Оптимизировать JSON поля при необходимости');

    console.log('\n🎉 ОПТИМИЗАЦИЯ БАЗЫ ДАННЫХ ЗАВЕРШЕНА!');

  } catch (error) {
    console.error('❌ Ошибка при оптимизации базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeDatabase();