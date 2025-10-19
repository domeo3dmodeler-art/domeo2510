const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhotoRetrieval() {
  try {
    console.log('🔍 Тестируем получение фото для модели d10...');
    
    // Проверяем, есть ли фото в property_photos
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo',
        propertyName: 'Артикул поставщика',
        propertyValue: 'd10'
      }
    });

    console.log(`📸 Найдено ${photos.length} фото в property_photos:`);
    photos.forEach(photo => {
      console.log(`   • ${photo.photoType}: ${photo.originalFilename}`);
    });

    // Тестируем структурирование напрямую
    const photoStructure = {
      cover: null,
      gallery: []
    };

    photos.forEach(photo => {
      if (photo.photoType === 'cover') {
        photoStructure.cover = photo.photoPath;
      } else if (photo.photoType.startsWith('gallery_')) {
        photoStructure.gallery.push(photo.photoPath);
      }
    });

    console.log(`\n📋 Структура фото:`);
    console.log(`   • Обложка: ${photoStructure.cover || 'нет'}`);
    console.log(`   • Галерея: ${photoStructure.gallery.length} фото`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhotoRetrieval();
