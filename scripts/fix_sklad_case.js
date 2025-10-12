const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSkladCase() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ РЕГИСТРА В ПОЛЕ "Склад/заказ"\n');
    console.log('⚠️  ВНИМАНИЕ: Будут изменены данные в базе!\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров для проверки: ${products.length}\n`);

    let totalFixed = 0;
    let productsWithChanges = 0;
    let lowercaseValuesFound = 0;

    // Обрабатываем каждый товар
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (!product.properties_data) continue;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        console.log(`❌ Ошибка парсинга для товара ${product.id}`);
        continue;
      }

      let hasChanges = false;
      const fixedProperties = { ...properties };

      // Проверяем поле "Склад/заказ"
      if (fixedProperties['Склад/заказ']) {
        const originalValue = fixedProperties['Склад/заказ'];
        
        // Заменяем "складское" на "Складское"
        if (originalValue === 'складское') {
          fixedProperties['Склад/заказ'] = 'Складское';
          lowercaseValuesFound++;
          hasChanges = true;
          
          if (lowercaseValuesFound <= 10) {
            console.log(`   ${product.sku}: "складское" → "Складское"`);
          }
        }
      }

      // Если есть изменения, обновляем товар
      if (hasChanges) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(fixedProperties)
            }
          });
          
          productsWithChanges++;
          totalFixed++;
          
          if (totalFixed % 100 === 0) {
            console.log(`✅ Исправлено товаров: ${totalFixed}/${products.length}`);
          }
        } catch (error) {
          console.log(`❌ Ошибка обновления товара ${product.id}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 ИСПРАВЛЕНИЕ РЕГИСТРА ЗАВЕРШЕНО!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Найдено "складское": ${lowercaseValuesFound}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

    if (lowercaseValuesFound > 10) {
      console.log(`   - Показаны первые 10 примеров из ${lowercaseValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении регистра:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSkladCase();
