const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    const products = await prisma.product.findMany({
      where: {
        catalog_category: { name: 'Межкомнатные двери' },
        is_active: true
      },
      select: {
        sku: true,
        properties_data: true
      },
      take: 5
    });

    console.log('Примеры товаров с фото:');
    products.forEach(product => {
      try {
        const props = JSON.parse(product.properties_data || '{}');
        const photos = props.photos || [];
        console.log('SKU:', product.sku);
        console.log('Модель:', props['Domeo_Название модели для Web']);
        console.log('Фото:', photos.length, 'шт.');
        if (photos.length > 0) {
          console.log('Первое фото:', photos[0]);
        }
        console.log('---');
      } catch (e) {
        console.log('Ошибка парсинга', product.sku, ':', e.message);
      }
    });
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();
