const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== КЛЮЧИ В ФОТО ===\n');
  
  const photos = await prisma.propertyPhoto.findMany({
    take: 30
  });
  
  const keys = new Set();
  for (const photo of photos) {
    keys.add(photo.propertyValue);
  }
  
  console.log(`Уникальных ключей: ${keys.size}\n`);
  
  Array.from(keys).sort().forEach(key => {
    console.log(`  - ${key}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

