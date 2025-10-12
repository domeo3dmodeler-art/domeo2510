const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNonStandardWidth() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ НЕСТАНДАРТНОЙ ШИРИНЫ 400ММ НА 40ММ\n');
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
    let width400Found = 0;

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

      // Проверяем поле "Ширина/мм"
      if (fixedProperties['Ширина/мм']) {
        const originalValue = fixedProperties['Ширина/мм'];
        
        // Заменяем "400" на "40"
        if (originalValue === '400') {
          fixedProperties['Ширина/мм'] = '40';
          width400Found++;
          hasChanges = true;
          
          console.log(`   ${product.sku}: "400" → "40"`);
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
          
        } catch (error) {
          console.log(`❌ Ошибка обновления товара ${product.id}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Найдено ширины "400": ${width400Found}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении ширины:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNonStandardWidth();
