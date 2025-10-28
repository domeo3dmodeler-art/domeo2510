const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== Checking photos in DB ===\n');
  
  const photo = await prisma.propertyPhoto.findFirst({
    where: { 
      propertyName: 'Domeo_Название модели для Web',
      propertyValue: { contains: 'base 2' }
    }
  });
  
  console.log('Photo found:', !!photo);
  if (photo) {
    console.log('photoPath:', photo.photoPath);
    console.log('model:', photo.propertyValue);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
