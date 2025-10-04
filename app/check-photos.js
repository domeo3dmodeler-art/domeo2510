const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    console.log('=== ПРОВЕРКА ФОТО В ТОВАРАХ ===');
    
    // Получаем все товары с properties_data
    const products = await prisma.product.findMany({
      where: {
        properties_data: {
          not: null
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        catalog_category_id: true
      },
      take: 10
    });
    
    console.log(`Найдено ${products.length} товаров с properties_data`);
    
    products.forEach((product, index) => {
      console.log(`\n--- Товар ${index + 1} ---`);
      console.log(`ID: ${product.id}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Name: ${product.name}`);
      console.log(`Category ID: ${product.catalog_category_id}`);
      
      try {
        const properties = JSON.parse(product.properties_data);
        console.log('Properties keys:', Object.keys(properties));
        
        if (properties.photos) {
          console.log('Photos:', properties.photos);
          console.log('Photos type:', typeof properties.photos);
          console.log('Photos is array:', Array.isArray(properties.photos));
          console.log('Photos length:', properties.photos?.length || 0);
        } else {
          console.log('❌ Нет поля photos в properties');
        }
        
        // Показываем все свойства
        console.log('Все свойства:');
        Object.entries(properties).forEach(([key, value]) => {
          console.log(`  ${key}: ${value} (${typeof value})`);
        });
        
      } catch (error) {
        console.error('Ошибка парсинга properties_data:', error);
      }
    });
    
    // Проверяем категории
    console.log('\n=== ПРОВЕРКА КАТЕГОРИЙ ===');
    const categories = await prisma.catalogCategory.findMany({
      where: {
        products: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        level: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    console.log(`Найдено ${categories.length} категорий с товарами:`);
    categories.forEach(cat => {
      console.log(`  ${cat.name} (ID: ${cat.id}, Level: ${cat.level}) - ${cat._count.products} товаров`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();



