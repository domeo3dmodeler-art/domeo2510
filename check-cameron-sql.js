const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Ищем фото для Cameron (case insensitive)
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        OR: [
          { propertyValue: { contains: 'cameron', mode: 'insensitive' } },
          { propertyValue: { contains: 'Cameron', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        photoPath: true,
        propertyValue: true,
        photoType: true,
        propertyName: true
      }
    });
    
    console.log('\nPhotos for Cameron (any case):');
    if (photos.length === 0) {
      console.log('  No photos found for Cameron');
    } else {
      photos.forEach(p => {
        console.log(`  ${p.propertyValue} -> ${p.photoPath} (${p.photoType})`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
