const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Ищем фото для moonstone_1
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        propertyName: 'Domeo_Название модели для Web',
        propertyValue: {
          contains: 'moonstone'
        }
      }
    });
    
    console.log(`Найдено фото для Moonstone: ${photos.length}`);
    photos.forEach(p => {
      console.log(`${p.propertyValue} -> ${p.photoType} (${p.photoPath})`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
