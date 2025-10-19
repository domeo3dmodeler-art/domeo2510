const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateExistingPhotos() {
  try {
    console.log('🔄 Переносим существующие фото в новую структуру property_photos...');
    
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

    let migratedPhotos = 0;
    let skippedPhotos = 0;
    const processedValues = new Set();

    for (const product of products) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const supplierSku = properties['Артикул поставщика'];
        
        if (!supplierSku) {
          continue;
        }

        // Проверяем, есть ли фото в свойстве "photos"
        const photos = properties.photos || [];
        
        if (Array.isArray(photos) && photos.length > 0) {
          const valueKey = `${supplierSku}`;
          
          // Если уже обработали это значение, пропускаем
          if (processedValues.has(valueKey)) {
            skippedPhotos += photos.length;
            continue;
          }
          
          processedValues.add(valueKey);
          
          console.log(`\n=== ОБРАБОТКА АРТИКУЛА: ${supplierSku} ===`);
          console.log(`Найдено ${photos.length} фото`);

          // Переносим каждое фото в property_photos
          for (let i = 0; i < photos.length; i++) {
            const photoPath = photos[i];
            
            // Определяем тип фото
            const fileName = path.basename(photoPath);
            const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
            
            let photoType = 'cover';
            if (match) {
              photoType = `gallery_${match[2]}`;
            }

            // Проверяем, существует ли файл
            const fullPath = path.join(process.cwd(), 'public', photoPath);
            if (!fs.existsSync(fullPath)) {
              console.log(`⚠️ Файл не найден: ${photoPath}`);
              continue;
            }

            // Получаем информацию о файле
            const stats = fs.statSync(fullPath);
            
            try {
              // Сохраняем в property_photos
              await prisma.propertyPhoto.upsert({
                where: {
                  categoryId_propertyName_propertyValue_photoType: {
                    categoryId: 'cmg50xcgs001cv7mn0tdyk1wo',
                    propertyName: 'Артикул поставщика',
                    propertyValue: supplierSku,
                    photoType: photoType
                  }
                },
                update: {
                  photoPath: photoPath,
                  originalFilename: fileName,
                  fileSize: stats.size,
                  mimeType: 'image/png', // Предполагаем PNG
                  updatedAt: new Date()
                },
                create: {
                  categoryId: 'cmg50xcgs001cv7mn0tdyk1wo',
                  propertyName: 'Артикул поставщика',
                  propertyValue: supplierSku,
                  photoPath: photoPath,
                  photoType: photoType,
                  originalFilename: fileName,
                  fileSize: stats.size,
                  mimeType: 'image/png'
                }
              });

              migratedPhotos++;
              console.log(`✅ Перенесено фото: ${fileName} (тип: ${photoType})`);
              
            } catch (error) {
              console.error(`❌ Ошибка переноса фото ${fileName}:`, error.message);
            }
          }
        }
        
      } catch (error) {
        console.error(`Ошибка обработки товара ${product.sku}:`, error);
      }
    }

    console.log('\n🎉 ПЕРЕНОС ЗАВЕРШЕН!');
    console.log(`📊 Статистика:`);
    console.log(`   • Товаров обработано: ${products.length}`);
    console.log(`   • Уникальных артикулов: ${processedValues.size}`);
    console.log(`   • Фото перенесено: ${migratedPhotos}`);
    console.log(`   • Фото пропущено (дубликаты): ${skippedPhotos}`);

    // Проверяем результат
    const totalPropertyPhotos = await prisma.propertyPhoto.count({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      }
    });

    console.log(`\n📈 Итого фото в property_photos: ${totalPropertyPhotos}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем перенос
migrateExistingPhotos();
