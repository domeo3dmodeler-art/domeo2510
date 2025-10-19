const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migratePhotosFromFiles() {
  try {
    console.log('🔄 Переносим фото из файловой системы в property_photos...');
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products', 'cmg50xcgs001cv7mn0tdyk1wo');
    
    if (!fs.existsSync(uploadDir)) {
      console.log('❌ Директория с фото не найдена:', uploadDir);
      return;
    }

    const files = fs.readdirSync(uploadDir);
    const photoFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
    
    console.log(`📁 Найдено ${photoFiles.length} фото файлов`);

    let migratedPhotos = 0;
    let skippedPhotos = 0;
    const processedValues = new Set();

    for (const fileName of photoFiles) {
      try {
        // Парсим имя файла для получения артикула поставщика
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        
        // Убираем префикс с timestamp и случайными символами
        // Формат: timestamp_randomstring_articul.png
        const parts = nameWithoutExt.split('_');
        if (parts.length < 3) {
          console.log(`⚠️ Неожиданный формат файла: ${fileName}`);
          continue;
        }
        
        // Берем последнюю часть как артикул поставщика
        const supplierSku = parts[parts.length - 1];
        
        if (!supplierSku) {
          console.log(`⚠️ Не удалось извлечь артикул из: ${fileName}`);
          continue;
        }

        const valueKey = `${supplierSku}`;
        
        // Если уже обработали это значение, пропускаем
        if (processedValues.has(valueKey)) {
          skippedPhotos++;
          continue;
        }
        
        processedValues.add(valueKey);
        
        console.log(`\n=== ОБРАБОТКА АРТИКУЛА: ${supplierSku} ===`);
        console.log(`Файл: ${fileName}`);

        // Определяем тип фото
        const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
        let photoType = 'cover';
        
        if (match) {
          // Проверяем, что номер в конце - это номер галереи
          const lastPart = parts[parts.length - 1];
          const secondLastPart = parts[parts.length - 2];
          
          if (/^\d+$/.test(lastPart) && !/^\d+$/.test(secondLastPart)) {
            photoType = `gallery_${lastPart}`;
          }
        }

        const photoPath = `/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/${fileName}`;
        const fullPath = path.join(process.cwd(), 'public', photoPath);
        
        // Проверяем, существует ли файл
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
              mimeType: 'image/png',
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
        
      } catch (error) {
        console.error(`Ошибка обработки файла ${fileName}:`, error);
      }
    }

    console.log('\n🎉 ПЕРЕНОС ЗАВЕРШЕН!');
    console.log(`📊 Статистика:`);
    console.log(`   • Файлов обработано: ${photoFiles.length}`);
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

    // Показываем примеры перенесенных фото
    const samplePhotos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 Примеры перенесенных фото:');
    samplePhotos.forEach(photo => {
      console.log(`   • ${photo.propertyValue} (${photo.photoType}): ${photo.originalFilename}`);
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем перенос
migratePhotosFromFiles();
