const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Ищем фото для модели Cameron
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        propertyName: 'Domeo_Название модели для Web',
        propertyValue: 'DomeoDoors_Cameron_1'
      }
    });
    
    console.log('Photos for Cameron_1:');
    console.log(JSON.stringify(photos.map(p => ({
      photoPath: p.photoPath,
      isCover: p.photoType === 'cover'
    })), null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
