// Скрипт для исправления кодировки полей в существующих товарах
const { PrismaClient } = require('@prisma/client');
const { fixFieldsEncoding } = require('./lib/encoding-utils');

const prisma = new PrismaClient();

async function fixExistingProductsEncoding() {
  try {
    console.log('🔧 Начинаем исправление кодировки в существующих товарах...');
    
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
        properties_data: true
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров для проверки`);
    
    let fixedCount = 0;
    let totalFixedFields = 0;
    
    for (const product of products) {
      try {
        const properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        if (!properties || typeof properties !== 'object') {
          continue;
        }
        
        const originalKeys = Object.keys(properties);
        const fixedKeys = fixFieldsEncoding(originalKeys);
        
        // Проверяем, есть ли изменения в ключах
        const hasChanges = originalKeys.some((key, index) => key !== fixedKeys[index]);
        
        if (hasChanges) {
          // Создаем новый объект с исправленными ключами
          const fixedProperties = {};
          originalKeys.forEach((originalKey, index) => {
            const fixedKey = fixedKeys[index];
            fixedProperties[fixedKey] = properties[originalKey];
          });
          
          // Обновляем товар в базе данных
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(fixedProperties),
              specifications: JSON.stringify(fixedProperties)
            }
          });
          
          const changedFields = originalKeys.filter((key, index) => key !== fixedKeys[index]);
          console.log(`✅ Исправлен товар ${product.sku}: ${changedFields.length} полей`);
          console.log(`   Изменения: ${changedFields.map((key, index) => `"${key}" → "${fixedKeys[originalKeys.indexOf(key)]}"`).join(', ')}`);
          
          fixedCount++;
          totalFixedFields += changedFields.length;
        }
        
      } catch (error) {
        console.error(`❌ Ошибка при обработке товара ${product.sku}:`, error);
      }
    }
    
    console.log(`\n🎉 Исправление завершено!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Товаров исправлено: ${fixedCount}`);
    console.log(`   - Полей исправлено: ${totalFixedFields}`);
    console.log(`   - Всего товаров проверено: ${products.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixExistingProductsEncoding();
