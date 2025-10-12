const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDecimalPrices() {
  try {
    console.log('🔍 ПРОВЕРЯЕМ РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ ДЕСЯТИЧНЫХ ЦЕН\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем первые 10 товаров для проверки
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        properties_data: true
      },
      take: 10
    });

    console.log(`📦 Проверяем первые ${products.length} товаров:\n`);

    let decimalPricesFound = 0;
    let totalPrices = 0;

    products.forEach((product, index) => {
      if (!product.properties_data) return;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        return;
      }

      if (properties['Цена опт']) {
        totalPrices++;
        const price = properties['Цена опт'];
        const numericValue = parseFloat(price);
        
        if (!isNaN(numericValue)) {
          if (numericValue % 1 !== 0) {
            decimalPricesFound++;
            console.log(`❌ ${product.sku}: ${price} (десятичное)`);
          } else {
            console.log(`✅ ${product.sku}: ${price} (целое)`);
          }
        }
      }
    });

    console.log(`\n📊 Результат проверки:`);
    console.log(`   - Всего цен проверено: ${totalPrices}`);
    console.log(`   - Десятичных цен найдено: ${decimalPricesFound}`);
    console.log(`   - Целых цен: ${totalPrices - decimalPricesFound}`);

    if (decimalPricesFound === 0) {
      console.log(`\n🎉 ВСЕ ДЕСЯТИЧНЫЕ ЦЕНЫ ИСПРАВЛЕНЫ!`);
    } else {
      console.log(`\n⚠️  Остались десятичные цены: ${decimalPricesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDecimalPrices();
