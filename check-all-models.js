const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ВСЕ МОДЕЛИ В ТОВАРАХ ===\n');
  
  const products = await prisma.product.findMany({
    where: {
      catalog_category: {
        name: "Межкомнатные двери"
      }
    }
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
  
  console.log(`Всего уникальных моделей: ${models.size}\n`);
  
  const sortedModels = Array.from(models).sort();
  sortedModels.forEach(model => console.log(`  - ${model}`));
  
  await prisma.$disconnect();
}

main().catch(console.error);

