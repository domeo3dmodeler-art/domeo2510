const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductsWithNewColumns() {
  try {
    console.log('🔍 Проверяем товары с новыми столбцами...');
    
    // Ищем товары в категории "Двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      },
      take: 10
    });
    
    console.log(`📦 Найдено ${products.length} товаров:`);
    
    products.forEach((product, index) => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const articleNumber = properties['Артикул товаров'];
        const modelName = properties['Domeo_Название модели для Web'];
        
        console.log(`\n${index + 1}. Товар: ${product.sku}`);
        console.log(`   Артикул товаров: ${articleNumber || 'НЕТ'}`);
        console.log(`   Название модели: ${modelName || 'НЕТ'}`);
        
        // Показываем все доступные свойства
        const availableProperties = Object.keys(properties);
        console.log(`   Доступные свойства: ${availableProperties.slice(0, 5).join(', ')}${availableProperties.length > 5 ? '...' : ''}`);
        
      } catch (error) {
        console.error(`Ошибка обработки товара ${product.sku}:`, error.message);
      }
    });
    
    // Статистика по артикулам
    const articleStats = new Map();
    products.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const articleNumber = properties['Артикул товаров'];
        if (articleNumber) {
          articleStats.set(articleNumber, (articleStats.get(articleNumber) || 0) + 1);
        }
      } catch (error) {
        // Игнорируем ошибки парсинга
      }
    });
    
    console.log(`\n📊 Статистика по артикулам (топ-10):`);
    const sortedStats = Array.from(articleStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedStats.forEach(([article, count]) => {
      console.log(`   ${article}: ${count} товаров`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductsWithNewColumns();
