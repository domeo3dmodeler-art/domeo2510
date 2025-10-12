const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDecimalPrices() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ДЕСЯТИЧНЫХ ЗНАЧЕНИЙ В "Цена опт"\n');
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
    let decimalPricesFound = 0;

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

      // Проверяем поле "Цена опт"
      if (fixedProperties['Цена опт']) {
        const originalPrice = fixedProperties['Цена опт'];
        
        // Проверяем, является ли значение числом с десятичными знаками
        if (typeof originalPrice === 'string') {
          const numericValue = parseFloat(originalPrice);
          
          if (!isNaN(numericValue) && numericValue % 1 !== 0) {
            // Округляем до целого числа
            const roundedPrice = Math.round(numericValue);
            fixedProperties['Цена опт'] = roundedPrice.toString();
            
            decimalPricesFound++;
            hasChanges = true;
            
            if (decimalPricesFound <= 10) {
              console.log(`   ${product.sku}: ${originalPrice} → ${roundedPrice}`);
            }
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
    console.log(`   - Найдено десятичных цен: ${decimalPricesFound}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

    if (decimalPricesFound > 10) {
      console.log(`   - Показаны первые 10 примеров из ${decimalPricesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении десятичных цен:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDecimalPrices();
