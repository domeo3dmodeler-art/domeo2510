const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const photos = await prisma.propertyPhoto.findMany({
    where: {
      propertyValue: {
        contains: 'ruby'
      }
    },
    take: 3
  });
  
  console.log('\n=== Photo paths in DB ===\n');
  for (const photo of photos) {
    console.log(`Model: ${photo.propertyValue}`);
    console.log(`Path: ${photo.photoPath}`);
    console.log(`Starts with /?: ${photo.photoPath.startsWith('/')}`);
    console.log('---');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

