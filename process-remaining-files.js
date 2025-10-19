const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function processRemainingFiles() {
  try {
    console.log('🔄 Обрабатываем оставшиеся файлы с простыми именами...');
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products', 'cmg50xcgs001cv7mn0tdyk1wo');
    const files = fs.readdirSync(uploadDir);
    
    // Фильтруем файлы с простыми именами (d10.png, d10_1.png, etc.)
    const simpleFiles = files.filter(file => 
      file.match(/^d\d+\.png$/) || file.match(/^d\d+_\d+\.png$/)
    );
    
    console.log(`📁 Найдено ${simpleFiles.length} файлов с простыми именами`);

    for (const fileName of simpleFiles) {
      try {
        console.log(`\n=== ОБРАБОТКА: ${fileName} ===`);

        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        
        let supplierSku = '';
        let photoType = 'cover';
        
        // Проверяем формат d10_1.png
        const match = nameWithoutExt.match(/^(d\d+)_(\d+)$/);
        if (match) {
          supplierSku = match[1];
          photoType = `gallery_${match[2]}`;
        } else {
          // Формат d10.png
          supplierSku = nameWithoutExt;
          photoType = 'cover';
        }

        console.log(`Артикул: ${supplierSku}, Тип: ${photoType}`);

        const photoPath = `/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/${fileName}`;
        const fullPath = path.join(process.cwd(), 'public', photoPath);
        
        if (!fs.existsSync(fullPath)) {
          console.log(`⚠️ Файл не найден: ${photoPath}`);
          continue;
        }

        const stats = fs.statSync(fullPath);
        
        // Проверяем, есть ли уже такое фото
        const existingPhoto = await prisma.propertyPhoto.findUnique({
          where: {
            categoryId_propertyName_propertyValue_photoType: {
              categoryId: 'cmg50xcgs001cv7mn0tdyk1wo',
              propertyName: 'Артикул поставщика',
              propertyValue: supplierSku,
              photoType: photoType
            }
          }
        });

        if (existingPhoto) {
          console.log(`⚠️ Фото уже существует: ${supplierSku} (${photoType})`);
          continue;
        }

        // Создаем новое фото
        await prisma.propertyPhoto.create({
          data: {
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

        console.log(`✅ Добавлено фото: ${fileName} -> ${supplierSku} (${photoType})`);
        
      } catch (error) {
        console.error(`❌ Ошибка обработки ${fileName}:`, error.message);
      }
    }

    // Проверяем финальный результат
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

// Запускаем обработку
processRemainingFiles();
