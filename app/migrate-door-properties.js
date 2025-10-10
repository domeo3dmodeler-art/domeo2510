const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Скрипт миграции свойств дверей
 * 
 * Переименовывает свойства в БД с старых названий на новые (UI названия)
 * 
 * Старые → Новые:
 * - 'Domeo_Название модели для Web' → 'МОДЕЛЬ'
 * - 'Domeo_Стиль Web' → 'СТИЛЬ'
 * - 'Общее_Тип покрытия' → 'ТИП ПОКРЫТИЯ'
 * - 'Domeo_Цвет' → 'ЦВЕТ_DOMEO'
 */

async function migrateDoorProperties() {
  try {
    console.log('🔄 Начинаем миграцию свойств дверей...\n');
    
    // 1. Найдем категорию "Межкомнатные двери"
    const doorsCategory = await prisma.catalogCategory.findFirst({
      where: {
        name: "Межкомнатные двери"
      }
    });

    if (!doorsCategory) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📁 Найдена категория: ${doorsCategory.name} (ID: ${doorsCategory.id})\n`);

    // 2. Получим все товары из этой категории
    const doors = await prisma.product.findMany({
      where: {
        catalog_category_id: doorsCategory.id
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });
    
    console.log(`📦 Найдено товаров: ${doors.length}\n`);

    if (doors.length === 0) {
      console.log('❌ Товары в категории дверей не найдены');
      return;
    }

    // 3. Маппинг старых названий на новые
    const propertyMapping = {
      'Domeo_Название модели для Web': 'МОДЕЛЬ',
      'Domeo_Стиль Web': 'СТИЛЬ',
      'Общее_Тип покрытия': 'ТИП ПОКРЫТИЯ',
      'Domeo_Цвет': 'ЦВЕТ_DOMEO'
    };

    let migratedCount = 0;
    let errorCount = 0;

    console.log('🔄 Начинаем переименование свойств...\n');

    // 4. Переименовываем свойства для каждого товара
    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      
      try {
        // Парсим properties_data
        let properties = {};
        if (door.properties_data) {
          if (typeof door.properties_data === 'string') {
            properties = JSON.parse(door.properties_data);
          } else {
            properties = door.properties_data;
          }
        }

        let hasChanges = false;
        const newProperties = { ...properties };

        // Переименовываем свойства
        Object.entries(propertyMapping).forEach(([oldKey, newKey]) => {
          if (properties[oldKey] !== undefined) {
            newProperties[newKey] = properties[oldKey];
            delete newProperties[oldKey];
            hasChanges = true;
          }
        });

        // Обновляем в БД только если есть изменения
        if (hasChanges) {
          await prisma.product.update({
            where: { id: door.id },
            data: { properties_data: JSON.stringify(newProperties) }
          });
          
          migratedCount++;
          
          // Логируем прогресс каждые 100 товаров
          if (migratedCount % 100 === 0) {
            console.log(`✅ Мигрировано ${migratedCount} товаров...`);
          }
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Ошибка при миграции товара ${door.sku}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log('='.repeat(60));
    console.log(`📦 Всего товаров: ${doors.length}`);
    console.log(`✅ Успешно мигрировано: ${migratedCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📈 Процент успеха: ${((migratedCount / doors.length) * 100).toFixed(1)}%`);

    // 5. Проверяем результат миграции
    console.log('\n🔍 Проверяем результат миграции...\n');

    const sampleDoors = await prisma.product.findMany({
      where: {
        catalog_category_id: doorsCategory.id
      },
      take: 3,
      select: {
        id: true,
        sku: true,
        properties_data: true
      }
    });

    console.log('📋 Примеры обновленных свойств:');
    sampleDoors.forEach((door, index) => {
      const properties = door.properties_data ? 
        (typeof door.properties_data === 'string' ? JSON.parse(door.properties_data) : door.properties_data) : {};
      
      console.log(`\n${index + 1}. Товар ${door.sku}:`);
      Object.entries(propertyMapping).forEach(([oldKey, newKey]) => {
        const hasOld = properties[oldKey] !== undefined;
        const hasNew = properties[newKey] !== undefined;
        const status = hasNew ? '✅' : hasOld ? '❌' : '⚪';
        console.log(`   ${status} ${newKey}: ${hasNew ? properties[newKey] : hasOld ? properties[oldKey] : 'не найдено'}`);
      });
    });

    console.log('\n✅ Миграция завершена!');
    console.log('\n📝 Следующие шаги:');
    console.log('1. Обновить API endpoints (уже сделано)');
    console.log('2. Протестировать калькулятор дверей');
    console.log('3. Проверить генерацию документов');

  } catch (error) {
    console.error('❌ Критическая ошибка при миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateDoorProperties();

