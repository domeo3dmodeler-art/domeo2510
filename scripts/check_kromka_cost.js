const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkKromkaCost() {
  try {
    console.log('🔍 ПРОВЕРЯЕМ РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ "Стоимость надбавки за кромку"\n');

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

    let dashValuesFound = 0;
    let zeroValuesFound = 0;
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

      if (properties['Стоимость надбавки за кромку']) {
        totalValues++;
        const value = properties['Стоимость надбавки за кромку'];
        
        if (value === '-') {
          dashValuesFound++;
          console.log(`❌ ${product.sku}: "${value}" (не исправлено)`);
        } else if (value === '0') {
          zeroValuesFound++;
          console.log(`✅ ${product.sku}: "${value}" (исправлено)`);
        } else {
          console.log(`ℹ️  ${product.sku}: "${value}" (другое значение)`);
        }
      }
    });

    console.log(`\n📊 Результат проверки:`);
    console.log(`   - Всего значений проверено: ${totalValues}`);
    console.log(`   - Значений "-" найдено: ${dashValuesFound}`);
    console.log(`   - Значений "0" найдено: ${zeroValuesFound}`);

    if (dashValuesFound === 0) {
      console.log(`\n🎉 ВСЕ ЗНАЧЕНИЯ "-" ЗАМЕНЕНЫ НА "0"!`);
    } else {
      console.log(`\n⚠️  Остались значения "-": ${dashValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKromkaCost();
