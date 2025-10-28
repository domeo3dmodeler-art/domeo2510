const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== ИССЛЕДОВАНИЕ ФОТО РУЧЕК ===\n');
    
    // 1. Проверяем фото ручек в БД
    const handlePhotos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId: 'cmg50xchb001wv7mnbzhw5y9r' // Ручки
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`📸 Фото ручек в property_photo: ${handlePhotos.length}`);
    handlePhotos.forEach(p => {
      console.log(`  ${p.propertyName} = "${p.propertyValue}" → ${p.photoType} (${p.photoPath})`);
    });
    
    // 2. Проверяем товары ручек
    const handleProducts = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r'
      },
      select: {
        sku: true,
        name: true,
        properties_data: true
      },
      take: 10
    });
    
    console.log(`\n📦 Товары ручек: ${handleProducts.length}`);
    handleProducts.forEach(p => {
      try {
        const props = typeof p.properties_data === 'string' 
          ? JSON.parse(p.properties_data) 
          : p.properties_data;
        
        const article = props['Артикул поставщика'];
        const photos = props.photos;
        
        console.log(`  SKU: ${p.sku}, Артикул: ${article}`);
        if (photos) {
          console.log(`    Фото:`, Array.isArray(photos) ? photos : (photos.cover ? 'есть cover' : 'нет cover'));
        } else {
          console.log(`    Фото: нет`);
        }
      } catch (e) {
        console.log(`  SKU: ${p.sku} (ошибка)`);
      }
    });
    
    // 3. Проверяем файлы на диске
    const fs = require('fs');
    const uploadDir = '/app/public/uploads/products/cmg50xchb001wv7mnbzhw5y9r';
    
    try {
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.png'));
        console.log(`\n📁 Файлы на диске: ${files.length}`);
        files.slice(-10).forEach(f => console.log(`  ${f}`));
      }
    } catch (e) {
      console.log(`❌ Ошибка чтения файлов: ${e.message}`);
    }
    
    // 4. Проверяем, как API ищет фото для ручек
    console.log(`\n🔍 Проверяем логику поиска фото для ручек...`);
    
    // Получаем товар ручки
    if (handleProducts.length > 0) {
      const firstProduct = handleProducts[0];
      const props = typeof firstProduct.properties_data === 'string' 
        ? JSON.parse(firstProduct.properties_data) 
        : firstProduct.properties_data;
      
      const article = props['Артикул поставщика'];
      
      console.log(`\n  Пример: SKU ${firstProduct.sku}, Артикул "${article}"`);
      
      // Ищем фото по артикулу
      const photosByArticle = await prisma.propertyPhoto.findMany({
        where: {
          categoryId: 'cmg50xchb001wv7mnbzhw5y9r',
          propertyName: 'Артикул поставщика',
          propertyValue: article?.toLowerCase()
        }
      });
      
      console.log(`  Найдено фото по артикулу "${article}": ${photosByArticle.length}`);
      photosByArticle.forEach(p => {
        console.log(`    ${p.photoType} → ${p.photoPath}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
