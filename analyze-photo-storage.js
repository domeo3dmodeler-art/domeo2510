const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzePhotoStorage() {
  try {
    console.log('🔍 Анализируем хранение фото в базе данных...');
    
    // Получаем несколько товаров для анализа
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

    console.log(`📦 Анализируем ${products.length} товаров:`);

    for (const product of products) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const modelName = properties['Domeo_Название модели для Web'];
        const supplierSku = properties['Артикул поставщика'];
        const modelPhotos = properties['Domeo_Название модели для Web'];
        
        console.log(`\n--- Товар: ${product.sku} ---`);
        console.log(`Модель: ${modelName}`);
        console.log(`Артикул поставщика: ${supplierSku}`);
        console.log(`Фото в свойстве модели: ${Array.isArray(modelPhotos) ? modelPhotos.length : 'не массив'}`);
        
        if (Array.isArray(modelPhotos) && modelPhotos.length > 0) {
          console.log(`Фото:`);
          modelPhotos.forEach((photo, index) => {
            console.log(`  ${index + 1}. ${photo}`);
          });
        }
        
      } catch (error) {
        console.error(`Ошибка анализа товара ${product.sku}:`, error);
      }
    }

    // Проверим общую статистику
    const allProducts = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      select: {
        properties_data: true
      }
    });

    let totalPhotos = 0;
    let productsWithPhotos = 0;
    let productsWithModelPhotos = 0;

    for (const product of allProducts) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        
        // Проверяем фото в свойстве "photos"
        const photos = properties.photos || [];
        if (Array.isArray(photos) && photos.length > 0) {
          productsWithPhotos++;
          totalPhotos += photos.length;
        }
        
        // Проверяем фото в свойстве модели
        const modelPhotos = properties['Domeo_Название модели для Web'];
        if (Array.isArray(modelPhotos) && modelPhotos.length > 0) {
          productsWithModelPhotos++;
        }
        
      } catch (error) {
        // Игнорируем ошибки парсинга
      }
    }

    console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`Всего товаров: ${allProducts.length}`);
    console.log(`Товаров с фото в свойстве "photos": ${productsWithPhotos}`);
    console.log(`Товаров с фото в свойстве модели: ${productsWithModelPhotos}`);
    console.log(`Всего фото: ${totalPhotos}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем анализ
analyzePhotoStorage();
