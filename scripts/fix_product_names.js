const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductNames() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ НАЗВАНИЙ ТОВАРОВ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем товары без названия или с названием "Без названия"
    const products = await prisma.product.findMany({
      where: { 
        catalog_category_id: category.id,
        OR: [
          { name: null },
          { name: '' },
          { name: 'Без названия' }
        ]
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров без названия: ${products.length}\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // Обрабатываем каждый товар
    for (const product of products) {
      try {
        let newName = 'Дверь межкомнатная';

        // Парсим свойства товара
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.error(`Ошибка парсинга свойств для товара ${product.id}:`, e);
            continue;
          }
        }

        // Формируем название на основе свойств
        const parts = [];

        // Добавляем модель
        if (properties['Модель поставщика']) {
          parts.push(properties['Модель поставщика']);
        } else if (properties['Модель']) {
          parts.push(properties['Модель']);
        }

        // Добавляем размеры
        const width = properties['Ширина/мм'];
        const height = properties['Высота/мм'];
        if (width && height) {
          parts.push(`${width}x${height}мм`);
        }

        // Добавляем цвет
        if (properties['Domeo_Цвет']) {
          parts.push(properties['Domeo_Цвет']);
        } else if (properties['Цвет']) {
          parts.push(properties['Цвет']);
        }

        // Добавляем стиль
        if (properties['Domeo_Стиль Web']) {
          parts.push(properties['Domeo_Стиль Web']);
        } else if (properties['Стиль']) {
          parts.push(properties['Стиль']);
        }

        // Формируем итоговое название
        if (parts.length > 0) {
          newName = `Дверь межкомнатная ${parts.join(' ')}`;
        }

        // Обновляем товар
        await prisma.product.update({
          where: { id: product.id },
          data: { name: newName }
        });

        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`✅ Обновлено: ${updatedCount} товаров`);
        }

      } catch (error) {
        console.error(`❌ Ошибка при обновлении товара ${product.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n🎉 ИСПРАВЛЕНИЕ НАЗВАНИЙ ЗАВЕРШЕНО!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Успешно обновлено: ${updatedCount}`);
    console.log(`   - Ошибок: ${errorCount}`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении названий товаров:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductNames();
