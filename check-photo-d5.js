const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        propertyValue: { startsWith: 'd5' }
      }
    });
    
    console.log(JSON.stringify(photos, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
