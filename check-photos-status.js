const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ПРОВЕРКА ФОТО В БД ===\n');
    
    // Проверяем фото дверей
    const doorsPhotos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xcgs001cv7mn0tdyk1wo'
      }
    });
    
    console.log(`Фото дверей: ${doorsPhotos.length}`);
    if (doorsPhotos.length > 0) {
      doorsPhotos.slice(0, 5).forEach(p => {
        console.log(`  ${p.propertyName} = "${p.propertyValue}" → ${p.photoType}`);
      });
    }
    
    // Проверяем фото ручек в property_photo
    const handlesPropertyPhotos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xchb001wv7mnbzhw5y9r'
      }
    });
    
    console.log(`\nФото ручек в property_photo: ${handlesPropertyPhotos.length}`);
    
    // Проверяем фото ручек в properties_data
    const handleProducts = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r'
      },
      select: {
        sku: true,
        properties_data: true
      },
      take: 5
    });
    
    console.log(`\nПроверяем фото ручек в properties_data (${handleProducts.length} товаров):`);
    let withPhotos = 0;
    handleProducts.forEach(p => {
      try {
        const props = typeof p.properties_data === 'string' 
          ? JSON.parse(p.properties_data) 
          : p.properties_data;
        
        if (props.photos) {
          withPhotos++;
          console.log(`  SKU: ${p.sku}`);
          if (typeof props.photos === 'object' && props.photos.cover) {
            console.log(`    Cover: ${props.photos.cover}`);
            console.log(`    Gallery: ${props.photos.gallery.length}`);
          } else if (Array.isArray(props.photos) && props.photos.length > 0) {
            console.log(`    Photos array: ${props.photos.length}`);
          }
        }
      } catch (e) {
        // ignore
      }
    });
    
    console.log(`\n✅ Найдено товаров ручек с фото в properties_data: ${withPhotos}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
