const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductNamesFromWebName() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ НАЗВАНИЙ ТОВАРОВ ИЗ СВОЙСТВА "Domeo_Название модели для Web"\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем товары с названием "Без названия"
    const products = await prisma.product.findMany({
      where: { 
        catalog_category_id: category.id,
        name: 'Без названия'
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров с названием "Без названия": ${products.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Обрабатываем каждый товар
    for (const product of products) {
      try {
        // Парсим свойства товара
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.error(`Ошибка парсинга свойств для товара ${product.id}:`, e);
            errorCount++;
            continue;
          }
        }

        // Получаем название из свойства "Domeo_Название модели для Web"
        const webName = properties['Domeo_Название модели для Web'];
        
        if (!webName || webName.trim() === '') {
          skippedCount++;
          continue;
        }

        // Обновляем товар
        await prisma.product.update({
          where: { id: product.id },
          data: { name: webName.trim() }
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
    console.log(`   - Пропущено (нет названия): ${skippedCount}`);
    console.log(`   - Ошибок: ${errorCount}`);

    // Проверяем результат
    const updatedProducts = await prisma.product.findMany({
      where: { 
        catalog_category_id: category.id,
        name: { not: 'Без названия' }
      },
      select: { name: true },
      take: 5
    });

    console.log(`\n📋 Примеры обновленных названий:`);
    updatedProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. "${product.name}"`);
    });

  } catch (error) {
    console.error('❌ Ошибка при исправлении названий товаров:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductNamesFromWebName();
