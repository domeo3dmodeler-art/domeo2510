const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractDatabaseProperties() {
  try {
    console.log('🔍 Извлекаем свойства из базы данных каталога...\n');
    
    // 1. Найдем категорию "Межкомнатные двери"
    const doorsCategory = await prisma.catalogCategory.findFirst({
      where: {
        name: "Межкомнатные двери"
      }
    });

    if (!doorsCategory) {
      console.log('❌ Категория дверей не найдена');
      return;
    }

    console.log(`📁 Найдена категория: ${doorsCategory.name} (ID: ${doorsCategory.id})\n`);

    // 2. Получим все товары из этой категории
    const doorsProducts = await prisma.product.findMany({
      where: {
        catalog_category_id: doorsCategory.id
      },
      take: 10, // Берем первые 10 для анализа
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров в категории: ${doorsProducts.length}\n`);

    if (doorsProducts.length === 0) {
      console.log('❌ Товары в категории дверей не найдены');
      return;
    }

    // 3. Анализируем структуру properties_data
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ СВОЙСТВ:\n');

    const allKeys = new Set();
    const columnKeys = new Set();
    const realKeys = new Set();
    const keyValues = new Map(); // Для хранения примеров значений

    doorsProducts.forEach((product, index) => {
      console.log(`\n📦 Товар ${index + 1}: ${product.name || product.sku || product.id}`);
      
      if (product.properties_data) {
        try {
          const properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
          
          console.log(`   📋 Свойств: ${Object.keys(properties).length}`);
          
          Object.entries(properties).forEach(([key, value]) => {
            allKeys.add(key);
            
            // Классифицируем ключи
            if (key.startsWith('column_')) {
              columnKeys.add(key);
            } else {
              realKeys.add(key);
            }
            
            // Сохраняем примеры значений
            if (!keyValues.has(key)) {
              keyValues.set(key, []);
            }
            if (keyValues.get(key).length < 3) {
              keyValues.get(key).push(String(value).substring(0, 50));
            }
          });
          
        } catch (error) {
          console.log(`   ❌ Ошибка парсинга properties_data: ${error.message}`);
        }
      } else {
        console.log('   ⚠️ Нет properties_data');
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 СТАТИСТИКА СВОЙСТВ:');
    console.log('='.repeat(80));
    console.log(`Всего уникальных ключей: ${allKeys.size}`);
    console.log(`Ключи column_*: ${columnKeys.size}`);
    console.log(`Реальные ключи: ${realKeys.size}`);
    console.log(`Процент реальных ключей: ${((realKeys.size / allKeys.size) * 100).toFixed(1)}%`);

    // 4. Показываем все найденные ключи с примерами значений
    console.log('\n' + '='.repeat(80));
    console.log('🔑 ВСЕ НАЙДЕННЫЕ КЛЮЧИ С ПРИМЕРАМИ ЗНАЧЕНИЙ:');
    console.log('='.repeat(80));

    const sortedKeys = Array.from(allKeys).sort();
    
    sortedKeys.forEach(key => {
      const values = keyValues.get(key) || [];
      const isColumnKey = key.startsWith('column_');
      const prefix = isColumnKey ? '🔴' : '✅';
      
      console.log(`\n${prefix} "${key}"`);
      if (values.length > 0) {
        console.log(`   Примеры: ${values.join(', ')}`);
      } else {
        console.log(`   Примеры: (нет значений)`);
      }
    });

    // 5. Группируем реальные ключи по типам
    console.log('\n' + '='.repeat(80));
    console.log('📋 ГРУППИРОВКА РЕАЛЬНЫХ КЛЮЧЕЙ:');
    console.log('='.repeat(80));

    const grouped = {
      'Идентификация': [],
      'Основные параметры': [],
      'Размеры': [],
      'Ценообразование': [],
      'Цвета': [],
      'Материалы': [],
      'Технические': [],
      'Дополнительные': []
    };

    Array.from(realKeys).forEach(key => {
      const keyLower = key.toLowerCase();
      const values = keyValues.get(key) || [];
      
      if (keyLower.includes('артикул') || keyLower.includes('номер') || keyLower.includes('код') || keyLower.includes('sku')) {
        grouped['Идентификация'].push({ key, values });
      } else if (keyLower.includes('модель') || keyLower.includes('название') || keyLower.includes('имя')) {
        grouped['Основные параметры'].push({ key, values });
      } else if (keyLower.includes('ширина') || keyLower.includes('высота') || keyLower.includes('толщина') || keyLower.includes('/мм')) {
        grouped['Размеры'].push({ key, values });
      } else if (keyLower.includes('цена') || keyLower.includes('стоимость') || keyLower.includes('ррц')) {
        grouped['Ценообразование'].push({ key, values });
      } else if (keyLower.includes('цвет') || keyLower.includes('color')) {
        grouped['Цвета'].push({ key, values });
      } else if (keyLower.includes('покрытие') || keyLower.includes('материал') || keyLower.includes('тип') || keyLower.includes('стиль')) {
        grouped['Материалы'].push({ key, values });
      } else if (keyLower.includes('_id') || keyLower.includes('url') || keyLower.includes('path') || keyLower.includes('photo')) {
        grouped['Технические'].push({ key, values });
      } else {
        grouped['Дополнительные'].push({ key, values });
      }
    });

    Object.entries(grouped).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`\n${category}:`);
        items.forEach(({ key, values }) => {
          console.log(`  "${key}"`);
          if (values.length > 0) {
            console.log(`    Примеры: ${values.join(', ')}`);
          }
        });
      }
    });

    // 6. Создаем константы для API
    console.log('\n' + '='.repeat(80));
    console.log('🔧 КОНСТАНТЫ ДЛЯ API:');
    console.log('='.repeat(80));

    console.log('export const DOOR_PROPERTIES = {');
    Array.from(realKeys).sort().forEach(key => {
      const constantName = key
        .toUpperCase()
        .replace(/[^A-ZА-Я0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      console.log(`  ${constantName}: '${key}',`);
    });
    console.log('} as const;\n');

    // 7. Показываем проблемные ключи column_*
    if (columnKeys.size > 0) {
      console.log('🚨 ПРОБЛЕМНЫЕ КЛЮЧИ column_*:');
      console.log('='.repeat(50));
      Array.from(columnKeys).sort().forEach(key => {
        const values = keyValues.get(key) || [];
        console.log(`"${key}": ${values.join(', ')}`);
      });
      console.log('\n⚠️ Эти ключи нужно заменить на реальные названия из Excel!');
    }

    console.log('\n✅ Анализ завершен!');

  } catch (error) {
    console.error('❌ Ошибка при анализе базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractDatabaseProperties();
