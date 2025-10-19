const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('🔍 Проверяем товары в базе данных...');
    
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      },
      take: 5
    });

    console.log(`📦 Найдено ${products.length} товаров (показаны первые 5)`);
    
    products.forEach((product, index) => {
      console.log(`\n=== ТОВАР ${index + 1} ===`);
      console.log(`SKU: ${product.sku}`);
      
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const model = properties['Domeo_Название модели для Web'];
        const supplierSku = properties['Артикул поставщика'];
        
        console.log(`Модель: ${model}`);
        console.log(`Артикул поставщика: ${supplierSku}`);
      } catch (error) {
        console.log('Ошибка парсинга свойств:', error.message);
      }
    });

    // Проверяем общее количество товаров
    const totalProducts = await prisma.product.count({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      }
    });

    console.log(`\n📊 Общее количество товаров в категории "Двери": ${totalProducts}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
