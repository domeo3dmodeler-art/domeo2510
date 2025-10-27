const { PrismaClient } = require('@prisma/client');
const { getPropertyPhotos, structurePropertyPhotos } = require('./lib/property-photos');

const prisma = new PrismaClient();

async function main() {
  console.log('=== ПРОВЕРКА API RESPONSE ===\n');
  
  const models = ['DomeoDoors_Atom_4', 'DomeoDoors_Cameron_1', 'DomeoDoors_Alberti_4'];
  
  const results = {};
  
  for (const model of models) {
    const normalized = model.toLowerCase();
    
    console.log(`\nМодель: ${model}`);
    console.log(`Нормализованная: ${normalized}`);
    
    // Получаем фото
    const propertyPhotos = await getPropertyPhotos(
      'cmg50xcgs001cv7mn0tdyk1wo',
      'Domeo_Название модели для Web',
      normalized
    );
    
    console.log(`Найдено фото: ${propertyPhotos.length}`);
    
    // Структурируем
    const photoStructure = structurePropertyPhotos(propertyPhotos);
    
    console.log(`Обложка: ${photoStructure.cover}`);
    console.log(`Галерея: ${photoStructure.gallery.length} фото`);
    
    results[model] = {
      modelKey: model,
      photo: photoStructure.cover,
      photos: photoStructure,
      hasGallery: photoStructure.gallery.length > 0
    };
  }
  
  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(JSON.stringify(results, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);

