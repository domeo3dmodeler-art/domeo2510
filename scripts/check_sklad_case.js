const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSkladCase() {
  try {
    console.log('🔍 ПРОВЕРЯЕМ РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ РЕГИСТРА "Склад/заказ"\n');

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

    let lowercaseValuesFound = 0;
    let uppercaseValuesFound = 0;
    let totalValues = 0;

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

      if (properties['Склад/заказ']) {
        totalValues++;
        const value = properties['Склад/заказ'];
        
        if (value === 'складское') {
          lowercaseValuesFound++;
          console.log(`❌ ${product.sku}: "${value}" (не исправлено)`);
        } else if (value === 'Складское') {
          uppercaseValuesFound++;
          console.log(`✅ ${product.sku}: "${value}" (исправлено)`);
        } else {
          console.log(`ℹ️  ${product.sku}: "${value}" (другое значение)`);
        }
      }
    });

    console.log(`\n📊 Результат проверки:`);
    console.log(`   - Всего значений проверено: ${totalValues}`);
    console.log(`   - Значений "складское" найдено: ${lowercaseValuesFound}`);
    console.log(`   - Значений "Складское" найдено: ${uppercaseValuesFound}`);

    if (lowercaseValuesFound === 0) {
      console.log(`\n🎉 ВСЕ ЗНАЧЕНИЯ "складское" ИСПРАВЛЕНЫ НА "Складское"!`);
    } else {
      console.log(`\n⚠️  Остались значения "складское": ${lowercaseValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkladCase();
