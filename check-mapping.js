const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== СОПОСТАВЛЕНИЕ ФОТО И МОДЕЛЕЙ ===\n');
  
  // 1. Получаем все модели из товаров
  const products = await prisma.product.findMany({
    where: {
      catalog_category: {
        name: "Межкомнатные двери"
      }
    }
  });
  
  const modelsFromProducts = new Set();
  for (const product of products) {
    try {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      const modelName = properties['Domeo_Название модели для Web'];
      if (modelName) {
        modelsFromProducts.add(modelName);
      }
    } catch (e) {
      // Пропускаем
    }
  }
  
  // 2. Получаем все фото из propertyPhoto
  const photos = await prisma.propertyPhoto.findMany();
  const photosByModel = new Map();
  
  for (const photo of photos) {
    const modelName = photo.propertyValue;
    if (!photosByModel.has(modelName)) {
      photosByModel.set(modelName, []);
    }
    photosByModel.get(modelName).push(photo);
  }
  
  console.log(`Моделей в товарах: ${modelsFromProducts.size}`);
  console.log(`Моделей с фото: ${photosByModel.size}\n`);
  
  // 3. Сопоставление
  console.log('СОПОСТАВЛЕНИЕ:\n');
  
  for (const model of Array.from(modelsFromProducts).sort()) {
    const modelLower = model.toLowerCase().replace(/_/g, '');
    const hasPhotos = photosByModel.has(modelLower);
    
    if (hasPhotos) {
      const photos = photosByModel.get(modelLower);
      console.log(`✅ ${model}`);
      console.log(`   Photo key: ${modelLower}`);
      photos.forEach(p => {
        console.log(`   [${p.photoType}] ${p.photoPath.split('/').pop()}`);
      });
    } else {
      console.log(`❌ ${model}`);
      console.log(`   Photo key: ${modelLower}`);
      console.log(`   НЕТ ФОТО`);
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

