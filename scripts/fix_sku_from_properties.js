const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSkuFromProperties() {
  try {
    console.log('🚀 Начинаем исправление SKU из properties_data...');
    
    // Получаем все товары из категории "Межкомнатные двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров для проверки`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const product of products) {
      try {
        // Парсим properties_data
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.log(`⚠️ Ошибка парсинга properties_data для товара ${product.id}`);
            continue;
          }
        }
        
        // Ищем артикул поставщика в properties
        const supplierSku = properties['Артикул поставщика'] || 
                           properties['Артикул'] || 
                           properties['SKU'] ||
                           properties['Supplier SKU'];
        
        if (!supplierSku) {
          console.log(`⚠️ Товар ${product.id} не имеет артикула поставщика в properties`);
          skippedCount++;
          continue;
        }
        
        // Проверяем, нужно ли обновлять SKU
        if (product.sku === supplierSku) {
          console.log(`✅ Товар ${product.id} уже имеет правильный SKU: ${supplierSku}`);
          skippedCount++;
          continue;
        }
        
        // Проверяем, не существует ли уже товар с таким SKU
        const existingProduct = await prisma.product.findUnique({
          where: { sku: supplierSku }
        });
        
        if (existingProduct && existingProduct.id !== product.id) {
          console.log(`⚠️ Товар с SKU "${supplierSku}" уже существует (ID: ${existingProduct.id})`);
          errors.push(`Конфликт SKU: товар ${product.id} не может использовать SKU "${supplierSku}" - уже используется товаром ${existingProduct.id}`);
          continue;
        }
        
        // Обновляем SKU
        await prisma.product.update({
          where: { id: product.id },
          data: { 
            sku: supplierSku,
            updated_at: new Date()
          }
        });
        
        console.log(`✅ Обновлен SKU для товара ${product.id}: "${product.sku}" → "${supplierSku}"`);
        fixedCount++;
        
      } catch (error) {
        const errorMsg = `Ошибка обработки товара ${product.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📊 Результаты исправления SKU:');
    console.log(`✅ Исправлено: ${fixedCount} товаров`);
    console.log(`⏭️ Пропущено: ${skippedCount} товаров`);
    console.log(`❌ Ошибок: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Список ошибок:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Проверяем результат
    console.log('\n🔍 Проверка результата:');
    const sampleProducts = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      take: 5,
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });
    
    sampleProducts.forEach(product => {
      const properties = product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      const supplierSku = properties['Артикул поставщика'];
      
      console.log(`  - Товар ${product.id}:`);
      console.log(`    SKU в БД: "${product.sku}"`);
      console.log(`    Артикул в properties: "${supplierSku}"`);
      console.log(`    Совпадают: ${product.sku === supplierSku ? '✅' : '❌'}`);
      console.log(`    ---`);
    });
    
    console.log('\n🎉 Исправление SKU завершено!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSkuFromProperties();
