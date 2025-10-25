const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCompositeSkus() {
  try {
    console.log('🚀 Создаем составные SKU для уникальной идентификации...');
    
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
    
    console.log(`📦 Найдено ${products.length} товаров для обработки`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skuMap = new Map(); // Для отслеживания уникальности
    
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
        
        // Извлекаем ключевые поля для составного SKU
        const baseSku = properties['Артикул поставщика'] || 
                       properties['Артикул'] || 
                       properties['SKU'] ||
                       'UNKNOWN';
        
        const model = properties['Domeo_Название модели для Web'] || 'MODEL';
        const style = properties['Domeo_Стиль Web'] || 'STYLE';
        const finish = properties['Общее_Тип покрытия'] || 'FINISH';
        const color = properties['Domeo_Цвет'] || 'COLOR';
        const width = properties['Ширина/мм'] || 'WIDTH';
        const height = properties['Высота/мм'] || 'HEIGHT';
        
        // Создаем составной SKU
        const compositeSku = `${baseSku}_${model}_${style}_${finish}_${color}_${width}x${height}`
          .replace(/[^a-zA-Z0-9_-]/g, '_') // Заменяем спецсимволы
          .replace(/_+/g, '_') // Убираем множественные подчеркивания
          .toUpperCase();
        
        // Проверяем уникальность
        if (skuMap.has(compositeSku)) {
          // Если SKU уже существует, добавляем суффикс
          let counter = 1;
          let uniqueSku = `${compositeSku}_${counter}`;
          while (skuMap.has(uniqueSku)) {
            counter++;
            uniqueSku = `${compositeSku}_${counter}`;
          }
          skuMap.set(uniqueSku, product.id);
          console.log(`🔄 Создан уникальный SKU: ${uniqueSku} (было: ${compositeSku})`);
        } else {
          skuMap.set(compositeSku, product.id);
        }
        
        const finalSku = skuMap.has(compositeSku) ? compositeSku : 
          Array.from(skuMap.keys()).find(key => skuMap.get(key) === product.id);
        
        // Обновляем SKU
        await prisma.product.update({
          where: { id: product.id },
          data: { 
            sku: finalSku,
            updated_at: new Date()
          }
        });
        
        console.log(`✅ Обновлен SKU для товара ${product.id}: "${product.sku}" → "${finalSku}"`);
        fixedCount++;
        
      } catch (error) {
        const errorMsg = `Ошибка обработки товара ${product.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📊 Результаты создания составных SKU:');
    console.log(`✅ Исправлено: ${fixedCount} товаров`);
    console.log(`⏭️ Пропущено: ${skippedCount} товаров`);
    console.log(`❌ Ошибок: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Список ошибок:');
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      if (errors.length > 10) {
        console.log(`... и еще ${errors.length - 10} ошибок`);
      }
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
      
      console.log(`  - Товар ${product.id}:`);
      console.log(`    Новый SKU: "${product.sku}"`);
      console.log(`    Модель: "${properties['Domeo_Название модели для Web']}"`);
      console.log(`    Стиль: "${properties['Domeo_Стиль Web']}"`);
      console.log(`    Размер: ${properties['Ширина/мм']}x${properties['Высота/мм']}`);
      console.log(`    ---`);
    });
    
    // Проверяем уникальность SKU
    const uniqueSkus = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        sku: true
      }
    });
    
    const skuCounts = {};
    uniqueSkus.forEach(product => {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1;
    });
    
    const duplicates = Object.entries(skuCounts).filter(([sku, count]) => count > 1);
    
    console.log('\n🔍 Проверка уникальности SKU:');
    console.log(`📊 Всего SKU: ${Object.keys(skuCounts).length}`);
    console.log(`📊 Дубликатов: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ Найдены дубликаты SKU:');
      duplicates.slice(0, 5).forEach(([sku, count]) => {
        console.log(`  - "${sku}": ${count} товаров`);
      });
    } else {
      console.log('✅ Все SKU уникальны!');
    }
    
    console.log('\n🎉 Создание составных SKU завершено!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCompositeSkus();
