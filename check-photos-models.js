const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ПРОВЕРКА ФОТО И МОДЕЛЕЙ ===\n');
  
  // 1. Проверяем фото в БД
  console.log('1. ФОТО В БД:');
  console.log('─────────────────────────────────────────────────────────────');
  const photos = await prisma.propertyPhoto.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Всего фото в БД: ${await prisma.propertyPhoto.count()}`);
  console.log('\nПоследние 20 фото:');
  for (const photo of photos) {
    console.log(`  Модель: ${photo.propertyValue}`);
    console.log(`    Путь: ${photo.photoPath}`);
    console.log(`    Тип: ${photo.photoType}`);
    console.log('');
  }
  
  // 2. Проверяем модели в товарах
  console.log('\n2. МОДЕЛИ В ТОВАРАХ:');
  console.log('─────────────────────────────────────────────────────────────');
  const products = await prisma.product.findMany({
    where: {
      catalog_category: {
        name: "Межкомнатные двери"
      }
    },
    take: 100
  });
  
  const models = new Set();
  for (const product of products) {
    try {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      const modelName = properties['Domeo_Название модели для Web'];
      if (modelName) {
        models.add(modelName);
      }
    } catch (e) {
      // Пропускаем
    }
  }
  
  console.log(`Уникальных моделей в товарах: ${models.size}`);
  console.log('\nПервые 20 моделей:');
  Array.from(models).slice(0, 20).forEach(model => console.log(`  - ${model}`));
  
  // 3. Проверяем сопоставление
  console.log('\n3. СОПОСТАВЛЕНИЕ:');
  console.log('─────────────────────────────────────────────────────────────');
  
  // Группируем фото по моделям
  const photosByModel = new Map();
  const allPhotos = await prisma.propertyPhoto.findMany();
  
  for (const photo of allPhotos) {
    const modelName = photo.propertyValue.toLowerCase();
    if (!photosByModel.has(modelName)) {
      photosByModel.set(modelName, []);
    }
    photosByModel.get(modelName).push(photo);
  }
  
  console.log(`Уникальных моделей с фото: ${photosByModel.size}`);
  
  // Проверяем для каждой модели в товарах
  let modelsWithPhotos = 0;
  let modelsWithoutPhotos = 0;
  
  const modelsArray = Array.from(models);
  for (const model of modelsArray) {
    const modelLower = model.toLowerCase();
    const hasPhotos = photosByModel.has(modelLower);
    
    if (hasPhotos) {
      modelsWithPhotos++;
      const photos = photosByModel.get(modelLower);
      console.log(`\n✅ ${model}: ${photos.length} фото`);
      photos.forEach(p => {
        console.log(`   [${p.photoType}] ${p.photoPath.split('/').pop()}`);
      });
    } else {
      modelsWithoutPhotos++;
      if (modelsWithoutPhotos <= 5) {
        console.log(`\n❌ ${model}: нет фото`);
      }
    }
  }
  
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`Итого: ${modelsWithPhotos} с фото, ${modelsWithoutPhotos} без фото`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

