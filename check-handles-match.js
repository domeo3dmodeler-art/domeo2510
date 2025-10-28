const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ПРОВЕРКА СООТВЕТСТВИЯ ФОТО РУЧЕК ===\n');
    
    // Получаем фото ручек из property_photo
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xchb001wv7mnbzhw5y9r',
        propertyName: 'Domeo_наименование для Web'
      }
    });
    
    console.log(`Фото в property_photo: ${photos.length}`);
    if (photos.length > 0) {
      photos.slice(0, 10).forEach(p => {
        console.log(`  propertyValue: "${p.propertyValue}" → ${p.photoType}`);
      });
    }
    
    // Проверяем, есть ли записи в properties_data
    console.log(`\nПроверяем properties_data товаров ручек:`);
    
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r'
      },
      select: {
        sku: true,
        properties_data: true
      },
      take: 10
    });
    
    let withPhotos = 0;
    for (const product of products) {
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        const handleName = props['Domeo_наименование для Web'];
        const hasPhotos = props.photos && (
          (Array.isArray(props.photos) && props.photos.length > 0) ||
          (typeof props.photos === 'object' && (props.photos.cover || props.photos.gallery?.length > 0))
        );
        
        if (hasPhotos) {
          withPhotos++;
          console.log(`  ${handleName}: ЕСТЬ фото`);
        } else if (handleName) {
          console.log(`  ${handleName}: НЕТ фото`);
        }
      } catch (e) {
        // ignore
      }
    }
    
    console.log(`\n✅ Товаров с фото: ${withPhotos} из ${products.length}`);
    
    // Проверяем соответствие имени файла и значения в БД
    console.log(`\nПроверяем соответствие файлов и товаров:`);
    
    const testFiles = ['MIRA_BL', 'SOUK_BL', 'PIERRES_BL', 'VIVA_BL'];
    
    for (const fileName of testFiles) {
      const matchingProducts = await prisma.product.findMany({
        where: {
          catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r',
          properties_data: {
            contains: `"Domeo_наименование для Web":"${fileName}"`
          }
        },
        select: {
          sku: true,
          properties_data: true
        },
        take: 1
      });
      
      if (matchingProducts.length > 0) {
        console.log(`  ✅ ${fileName} → найдено ${matchingProducts.length} товар(ов)`);
        const props = typeof matchingProducts[0].properties_data === 'string' 
          ? JSON.parse(matchingProducts[0].properties_data) 
          : matchingProducts[0].properties_data;
        
        if (props.photos) {
          console.log(`     Фото: ЕСТЬ`);
        } else {
          console.log(`     Фото: НЕТ`);
        }
      } else {
        console.log(`  ❌ ${fileName} → товары НЕ найдены`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
