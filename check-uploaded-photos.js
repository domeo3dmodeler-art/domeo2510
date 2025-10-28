const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ПРОВЕРКА ФОТО В БД ===\n');
    
    // Проверяем фото в БД
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`Всего фото: ${photos.length}\n`);
    
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
    const path = require('path');
    
    const uploadDir = '/app/public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo';
    
    try {
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.png'));
        console.log(`Найдено файлов на диске: ${files.length}\n`);
        console.log('Последние файлы:');
        files.slice(-10).forEach(f => console.log(`  ${f}`));
      } else {
        console.log('❌ Папка не найдена!');
      }
    } catch (e) {
      console.log('❌ Ошибка чтения файлов:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
