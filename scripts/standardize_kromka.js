const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function standardizeKromka() {
  try {
    console.log('🔧 СТАНДАРТИЗАЦИЯ ПОЛЯ "Кромка"\n');
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
    let blackValuesFound = 0;
    let absBlackValuesFound = 0;

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

      // Проверяем поле "Кромка"
      if (fixedProperties['Кромка']) {
        const originalValue = fixedProperties['Кромка'];
        
        // Заменяем различные варианты "Black" на "Черная"
        if (originalValue === 'Black') {
          fixedProperties['Кромка'] = 'Черная';
          blackValuesFound++;
          hasChanges = true;
          
          if (blackValuesFound <= 10) {
            console.log(`   ${product.sku}: "Black" → "Черная"`);
          }
        } else if (originalValue === 'ABS BLACK') {
          fixedProperties['Кромка'] = 'Черная';
          absBlackValuesFound++;
          hasChanges = true;
          
          if (absBlackValuesFound <= 10) {
            console.log(`   ${product.sku}: "ABS BLACK" → "Черная"`);
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

    console.log(`\n🎉 СТАНДАРТИЗАЦИЯ ЗАВЕРШЕНА!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Найдено "Black": ${blackValuesFound}`);
    console.log(`   - Найдено "ABS BLACK": ${absBlackValuesFound}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

    if (blackValuesFound > 10) {
      console.log(`   - Показаны первые 10 примеров "Black" из ${blackValuesFound}`);
    }
    if (absBlackValuesFound > 10) {
      console.log(`   - Показаны первые 10 примеров "ABS BLACK" из ${absBlackValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при стандартизации кромки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

standardizeKromka();
