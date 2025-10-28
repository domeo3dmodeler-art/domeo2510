const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Удаляем все фото из БД...');
    
    const result = await prisma.propertyPhoto.deleteMany({});
    
    console.log(`✅ Удалено ${result.count} фото из property_photo`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
