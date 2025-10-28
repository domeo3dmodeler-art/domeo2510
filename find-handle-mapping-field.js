const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ПОИСК ПОЛЯ ДЛЯ ПРИВЯЗКИ ФОТО РУЧЕК ===\n');
    
    // Проверяем файлы на диске
    const fs = require('fs');
    const uploadDir = '/app/public/uploads/products/cmg50xchb001wv7mnbzhw5y9r';
    
    let files = [];
    if (fs.existsSync(uploadDir)) {
      files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.png'));
    }
    
    console.log(`Найдено файлов: ${files.length}`);
    
    // Берем несколько файлов и проверяем их соответствие товарам
    for (let i = 0; i < 5 && i < files.length; i++) {
      const fileName = files[i];
      // Извлекаем имя без префикса (1761588175210_db5p3e_)
      const parts = fileName.split('_').slice(2);
      const nameWithoutExt = parts.join('_').replace('.png', '').toLowerCase();
      
      console.log(`\nФайл: ${fileName}`);
      console.log(`  Имя без префикса: ${nameWithoutExt}`);
      
      // Пробуем найти товар
      const products1 = await prisma.product.findMany({
        where: {
          catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r',
          properties_data: {
            contains: `"Domeo_наименование для Web":"${nameWithoutExt.toUpperCase()}"`
          }
        },
        select: {
          sku: true,
          name: true
        },
        take: 1
      });
      
      console.log(`  Найдено по "Domeo_наименование для Web": ${products1.length}`);
      
      const products2 = await prisma.product.findMany({
        where: {
          catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r',
          properties_data: {
            contains: `"Фабрика_артикул":"${nameWithoutExt}"`
          }
        },
        select: {
          sku: true,
          name: true
        },
        take: 1
      });
      
      console.log(`  Найдено по "Фабрика_артикул": ${products2.length}`);
    }
    
    console.log('\n=== ПРОВЕРКА ФОТО В БД ===\n');
    
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xchb001wv7mnbzhw5y9r'
      },
      select: {
        propertyName: true,
        propertyValue: true
      },
      take: 10
    });
    
    console.log(`Фото в БД: ${photos.length}`);
    if (photos.length > 0) {
      console.log('Первые 10 записей:');
      photos.forEach(p => {
        console.log(`  ${p.propertyName} = "${p.propertyValue}"`);
      });
    } else {
      console.log('❌ Фото в БД нет! Нужно загрузить через /admin/import/photos');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
