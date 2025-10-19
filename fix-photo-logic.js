const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPhotoLogic() {
  try {
    console.log('🔧 Исправляем логику привязки фото к моделям...');
    
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

    // Группируем товары по моделям
    const modelGroups = new Map();
    
    for (const product of products) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const modelName = properties['Domeo_Название модели для Web'];
        
        if (modelName) {
          if (!modelGroups.has(modelName)) {
            modelGroups.set(modelName, []);
          }
          modelGroups.get(modelName).push(product);
        }
      } catch (error) {
        console.error(`Ошибка парсинга свойств товара ${product.sku}:`, error);
      }
    }

    console.log(`🏷️ Найдено ${modelGroups.size} уникальных моделей`);

    let fixedModels = 0;
    let totalPhotosRemoved = 0;

    // Для каждой модели оставляем фото только у первого товара
    for (const [modelName, modelProducts] of modelGroups) {
      if (modelProducts.length > 1) {
        console.log(`\n=== МОДЕЛЬ: ${modelName} ===`);
        console.log(`Товаров в модели: ${modelProducts.length}`);

        // Берем первый товар как представитель модели
        const representativeProduct = modelProducts[0];
        const representativeProperties = JSON.parse(representativeProduct.properties_data || '{}');
        const modelPhotos = representativeProperties['Domeo_Название модели для Web'] || [];

        console.log(`Фото у представителя: ${Array.isArray(modelPhotos) ? modelPhotos.length : 0}`);

        // Удаляем фото у всех остальных товаров модели
        for (let i = 1; i < modelProducts.length; i++) {
          const product = modelProducts[i];
          try {
            const currentProperties = JSON.parse(product.properties_data || '{}');
            const currentPhotos = currentProperties['Domeo_Название модели для Web'] || [];
            
            if (Array.isArray(currentPhotos) && currentPhotos.length > 0) {
              currentProperties['Domeo_Название модели для Web'] = [];
              
              await prisma.product.update({
                where: { id: product.id },
                data: {
                  properties_data: JSON.stringify(currentProperties)
                }
              });
              
              totalPhotosRemoved += currentPhotos.length;
              console.log(`  Удалено ${currentPhotos.length} фото у товара ${product.sku}`);
            }
          } catch (error) {
            console.error(`Ошибка при очистке фото у товара ${product.sku}:`, error);
          }
        }

        fixedModels++;
      }
    }

    console.log('\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log(`📊 Статистика:`);
    console.log(`   • Моделей обработано: ${modelGroups.size}`);
    console.log(`   • Моделей с множественными товарами: ${fixedModels}`);
    console.log(`   • Фото удалено у товаров: ${totalPhotosRemoved}`);
    console.log(`   • Фото остались только у представителей моделей`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixPhotoLogic();
