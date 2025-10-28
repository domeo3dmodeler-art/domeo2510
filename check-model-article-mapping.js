const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Получаем товары и проверяем соответствие модели и артикула
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      select: {
        sku: true,
        properties_data: true
      },
      take: 10
    });
    
    console.log('\n=== ПРОВЕРКА СООТВЕТСТВИЯ МОДЕЛЬ ↔ АРТИКУЛ ===\n');
    
    for (const product of products) {
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        const article = props['Артикул поставщика'];
        const model = props['Domeo_Название модели для Web'];
        
        console.log(`Модель: ${model} → Артикул: ${article}`);
      } catch (e) {
        console.log(`SKU: ${product.sku} (ошибка парсинга)`);
      }
    }
    
    // Проверяем, есть ли фото в БД для этих артикулов
    console.log('\n=== ПРОВЕРКА ФОТО В БД ===\n');
    
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        propertyName: 'Артикул поставщика'
      },
      select: {
        propertyValue: true,
        photoType: true
      },
      take: 10
    });
    
    console.log(`Найдено фото по артикулам: ${photos.length}`);
    photos.forEach(p => {
      console.log(`  Артикул: ${p.propertyValue}, Тип: ${p.photoType}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
