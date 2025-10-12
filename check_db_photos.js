const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDBPhotos() {
  try {
    // Найдем товары с фото
    const products = await prisma.product.findMany({
      where: {
        catalog_category: { name: 'Межкомнатные двери' },
        is_active: true,
        properties_data: {
          contains: 'photos'
        }
      },
      select: {
        sku: true,
        properties_data: true
      },
      take: 3
    });

    console.log('Найдено товаров с фото:', products.length);
    
    products.forEach((product, index) => {
      try {
        const props = JSON.parse(product.properties_data || '{}');
        const photos = props.photos || [];
        const model = props['Domeo_Название модели для Web'];
        
        console.log(`\n=== Товар ${index + 1} ===`);
        console.log('SKU:', product.sku);
        console.log('Модель:', model);
        console.log('Количество фото:', photos.length);
        
        if (photos.length > 0) {
          console.log('Фото:');
          photos.forEach((photo, i) => {
            console.log(`  ${i + 1}. ${photo}`);
          });
        }
      } catch (e) {
        console.log('Ошибка парсинга:', e.message);
      }
    });

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDBPhotos();
