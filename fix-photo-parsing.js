const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixPhotoParsing() {
  try {
    console.log('🔧 Исправляем парсинг фото с суффиксами...');
    
    // Получаем все фото с неправильными артикулами
    const wrongPhotos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo',
        propertyValue: {
          in: ['1', '2'] // Неправильные артикулы
        }
      }
    });

    console.log(`📦 Найдено ${wrongPhotos.length} фото с неправильными артикулами`);

    for (const photo of wrongPhotos) {
      try {
        const fileName = photo.originalFilename;
        console.log(`\n=== ИСПРАВЛЕНИЕ: ${fileName} ===`);

        // Парсим имя файла правильно
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        
        // Убираем префикс с timestamp и случайными символами
        const parts = nameWithoutExt.split('_');
        
        if (parts.length >= 3) {
          // Берем последние две части как артикул и номер
          const lastPart = parts[parts.length - 1];
          const secondLastPart = parts[parts.length - 2];
          
          let supplierSku = '';
          let photoType = 'cover';
          
          if (/^\d+$/.test(lastPart)) {
            // Последняя часть - это номер галереи
            supplierSku = secondLastPart;
            photoType = `gallery_${lastPart}`;
          } else {
            // Последняя часть - это артикул
            supplierSku = lastPart;
            photoType = 'cover';
          }

          console.log(`Артикул: ${supplierSku}, Тип: ${photoType}`);

          // Удаляем старое фото
          await prisma.propertyPhoto.delete({
            where: { id: photo.id }
          });

          // Создаем новое фото с правильными данными
          await prisma.propertyPhoto.create({
            data: {
              categoryId: photo.categoryId,
              propertyName: photo.propertyName,
              propertyValue: supplierSku,
              photoPath: photo.photoPath,
              photoType: photoType,
              originalFilename: photo.originalFilename,
              fileSize: photo.fileSize,
              mimeType: photo.mimeType
            }
          });

          console.log(`✅ Исправлено: ${fileName} -> ${supplierSku} (${photoType})`);
        }
        
      } catch (error) {
        console.error(`❌ Ошибка исправления ${photo.originalFilename}:`, error.message);
      }
    }

    // Проверяем результат
    const totalPropertyPhotos = await prisma.propertyPhoto.count({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      }
    });

    console.log(`\n📈 Итого фото в property_photos: ${totalPropertyPhotos}`);

    // Показываем все фото по артикулам
    const photosByArticul = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      orderBy: [
        { propertyValue: 'asc' },
        { photoType: 'asc' }
      ]
    });

    console.log('\n📋 Все фото по артикулам:');
    const groupedPhotos = photosByArticul.reduce((acc, photo) => {
      if (!acc[photo.propertyValue]) {
        acc[photo.propertyValue] = [];
      }
      acc[photo.propertyValue].push(photo);
      return acc;
    }, {});

    Object.keys(groupedPhotos).forEach(articul => {
      const photos = groupedPhotos[articul];
      console.log(`   • ${articul}: ${photos.length} фото`);
      photos.forEach(photo => {
        console.log(`     - ${photo.photoType}: ${photo.originalFilename}`);
      });
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixPhotoParsing();
