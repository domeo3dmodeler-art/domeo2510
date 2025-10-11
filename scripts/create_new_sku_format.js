const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNewSkuFormat() {
  try {
    console.log('🚀 Создаем новый формат SKU: [Модель]-[Размер]-[Покрытие]-[Цвет]-[Номер]...');
    
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
        
        // Извлекаем компоненты для нового SKU
        const model = properties['Domeo_Название модели для Web'] || 'UNKNOWN_MODEL';
        const width = properties['Ширина/мм'] || 'UNKNOWN_WIDTH';
        const height = properties['Высота/мм'] || 'UNKNOWN_HEIGHT';
        const finish = properties['Общее_Тип покрытия'] || 'UNKNOWN_FINISH';
        const color = properties['Domeo_Цвет'] || 'UNKNOWN_COLOR';
        
        const size = `${width}x${height}`;
        
        // Создаем базовый SKU без номера
        const baseSku = `${model}-${size}-${finish}-${color}`;
        
        // Проверяем уникальность и добавляем номер
        let finalSku;
        if (skuMap.has(baseSku)) {
          // Если комбинация уже существует, добавляем номер
          let counter = 1;
          finalSku = `${baseSku}-${String(counter).padStart(3, '0')}`;
          while (skuMap.has(finalSku)) {
            counter++;
            finalSku = `${baseSku}-${String(counter).padStart(3, '0')}`;
          }
          skuMap.set(finalSku, product.id);
          console.log(`🔄 Создан уникальный SKU: ${finalSku} (базовый: ${baseSku})`);
        } else {
          // Первая комбинация - добавляем -001
          finalSku = `${baseSku}-001`;
          skuMap.set(finalSku, product.id);
        }
        
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
    
    console.log('\n📊 Результаты создания нового формата SKU:');
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
        properties_data: true
      }
    });
    
    sampleProducts.forEach(product => {
      const properties = product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      
      console.log(`  - Товар ${product.id}:`);
      console.log(`    Новый SKU: "${product.sku}"`);
      console.log(`    Модель: "${properties['Domeo_Название модели для Web']}"`);
      console.log(`    Размер: ${properties['Ширина/мм']}x${properties['Высота/мм']}`);
      console.log(`    Покрытие: "${properties['Общее_Тип покрытия']}"`);
      console.log(`    Цвет: "${properties['Domeo_Цвет']}"`);
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
    
    // Статистика по формату
    console.log('\n📈 Статистика по формату SKU:');
    const formatStats = new Map();
    Object.keys(skuCounts).forEach(sku => {
      const parts = sku.split('-');
      if (parts.length >= 5) {
        const baseFormat = parts.slice(0, 4).join('-');
        formatStats.set(baseFormat, (formatStats.get(baseFormat) || 0) + 1);
      }
    });
    
    console.log(`📊 Уникальных базовых комбинаций: ${formatStats.size}`);
    Array.from(formatStats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([format, count]) => {
      console.log(`  ${format}: ${count} вариантов`);
    });
    
    console.log('\n🎉 Создание нового формата SKU завершено!');
    console.log('\n📝 Примеры нового формата:');
    console.log('DomeoDoors_Base_1-600x2000-ПВХ-Белый-001');
    console.log('DomeoDoors_Base_1-600x2000-ПВХ-Белый-002');
    console.log('DomeoDoors_Invisible-700x2000-Эмаль-Серый-001');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewSkuFormat();
