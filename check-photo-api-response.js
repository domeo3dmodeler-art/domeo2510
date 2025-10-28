const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking photo paths in DB ===\n');
  
  const photos = await prisma.propertyPhoto.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  for (const photo of photos) {
    console.log(`Photo ID: ${photo.id}`);
    console.log(`Property: ${photo.propertyName}`);
    console.log(`Value: ${photo.propertyValue}`);
    console.log(`PhotoPath: "${photo.photoPath}"`);
    console.log(`Starts with /?: ${photo.photoPath.startsWith('/')}`);
    console.log(`Starts with "products"?: ${photo.photoPath.startsWith('products')}`);
    console.log('---');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

