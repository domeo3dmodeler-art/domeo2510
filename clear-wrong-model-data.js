const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearWrongModelData() {
  try {
    console.log('🧹 Очищаем неправильные данные в свойстве модели...');
    
    // Получаем все товары в категории "Двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено ${products.length} товаров`);

    let clearedProducts = 0;
    let totalPhotosRemoved = 0;

    for (const product of products) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const modelProperty = properties['Domeo_Название модели для Web'];
        
        // Проверяем, является ли свойство модели массивом (что неправильно)
        if (Array.isArray(modelProperty)) {
          console.log(`Товар ${product.sku}: свойство модели содержит массив фото (${modelProperty.length} фото)`);
          
          // Очищаем неправильное свойство модели
          properties['Domeo_Название модели для Web'] = '';
          
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(properties)
            }
          });
          
          clearedProducts++;
          totalPhotosRemoved += modelProperty.length;
        }
        
      } catch (error) {
        console.error(`Ошибка обработки товара ${product.sku}:`, error);
      }
    }

    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА!');
    console.log(`📊 Статистика:`);
    console.log(`   • Товаров обработано: ${products.length}`);
    console.log(`   • Товаров с неправильными данными: ${clearedProducts}`);
    console.log(`   • Фото удалено: ${totalPhotosRemoved}`);
    console.log(`   • Свойство "Domeo_Название модели для Web" очищено`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем очистку
clearWrongModelData();
