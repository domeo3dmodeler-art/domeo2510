const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ПРОВЕРКА ФОТО РУЧЕК В БД ===\n');
    
    // Проверяем фото с propertyName = "Domeo_наименование для Web"
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        propertyName: 'Domeo_наименование для Web'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`Найдено фото: ${photos.length}\n`);
    
    if (photos.length > 0) {
      console.log('Последние загруженные фото:');
      photos.forEach(p => {
        console.log(`  ${p.propertyName} = "${p.propertyValue}" → ${p.photoType} (${p.photoPath})`);
      });
    } else {
      console.log('❌ Фото в БД не найдено!');
    }
    
    // Проверяем файлы на диске
    console.log('\n=== ПРОВЕРКА ФАЙЛОВ НА ДИСКЕ ===\n');
    const fs = require('fs');
    const uploadDir = '/app/public/uploads/products/cmg50xchb001wv7mnbzhw5y9r';
    
    try {
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        console.log(`Найдено файлов: ${files.length}`);
        console.log('Последние файлы:');
        files.slice(-10).forEach(f => console.log(`  ${f}`));
      }
    } catch (e) {
      console.log(`❌ Ошибка чтения файлов: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
