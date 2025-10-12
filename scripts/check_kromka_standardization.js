const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkKromkaStandardization() {
  try {
    console.log('🔍 ПРОВЕРЯЕМ РЕЗУЛЬТАТ СТАНДАРТИЗАЦИИ "Кромка"\n');

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

    let blackValuesFound = 0;
    let absBlackValuesFound = 0;
    let chernayaValuesFound = 0;
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

      if (properties['Кромка']) {
        totalValues++;
        const value = properties['Кромка'];
        
        if (value === 'Black') {
          blackValuesFound++;
          console.log(`❌ ${product.sku}: "${value}" (не исправлено)`);
        } else if (value === 'ABS BLACK') {
          absBlackValuesFound++;
          console.log(`❌ ${product.sku}: "${value}" (не исправлено)`);
        } else if (value === 'Черная') {
          chernayaValuesFound++;
          console.log(`✅ ${product.sku}: "${value}" (стандартизировано)`);
        } else {
          console.log(`ℹ️  ${product.sku}: "${value}" (другое значение)`);
        }
      }
    });

    console.log(`\n📊 Результат проверки:`);
    console.log(`   - Всего значений проверено: ${totalValues}`);
    console.log(`   - Значений "Black" найдено: ${blackValuesFound}`);
    console.log(`   - Значений "ABS BLACK" найдено: ${absBlackValuesFound}`);
    console.log(`   - Значений "Черная" найдено: ${chernayaValuesFound}`);

    if (blackValuesFound === 0 && absBlackValuesFound === 0) {
      console.log(`\n🎉 ВСЕ ВАРИАНТЫ "Black" ЗАМЕНЕНЫ НА "Черная"!`);
    } else {
      console.log(`\n⚠️  Остались нестандартизированные значения:`);
      if (blackValuesFound > 0) console.log(`   - "Black": ${blackValuesFound}`);
      if (absBlackValuesFound > 0) console.log(`   - "ABS BLACK": ${absBlackValuesFound}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKromkaStandardization();
