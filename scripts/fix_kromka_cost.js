const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixKromkaCost() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ЗНАЧЕНИЙ В "Стоимость надбавки за кромку"\n');
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
    let dashValuesFound = 0;

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

      // Проверяем поле "Стоимость надбавки за кромку"
      if (fixedProperties['Стоимость надбавки за кромку']) {
        const originalValue = fixedProperties['Стоимость надбавки за кромку'];
        
        // Заменяем "-" на "0"
        if (originalValue === '-') {
          fixedProperties['Стоимость надбавки за кромку'] = '0';
          
          dashValuesFound++;
          hasChanges = true;
          
          if (dashValuesFound <= 10) {
            console.log(`   ${product.sku}: "${originalValue}" → "0"`);
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

    console.log(`\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Найдено значений "-": ${dashValuesFound}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

    if (dashValuesFound > 10) {
      console.log(`   - Показаны первые 10 примеров из ${dashValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении стоимости кромки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixKromkaCost();
